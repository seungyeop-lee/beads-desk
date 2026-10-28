import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { type FileHandle, lstat, open, realpath } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, type PlatformPath, posix, relative, sep, win32 } from "node:path";
import { Readable } from "node:stream";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** 파일 안의 byte 구간입니다. `end`도 구간에 포함합니다. */
export type ByteRange = { start: number; end: number };

type LocalFile = { status: 200; contents: Uint8Array<ArrayBuffer> } | { status: 403 | 404 };
type LocalFilePart =
  | { status: 206; size: number; range: ByteRange; contents: ReadableStream<Uint8Array> }
  | { status: 416; size: number }
  | { status: 403 | 404 };

export async function readLocalFile(workspace: string, path: string): Promise<LocalFile> {
  const opened = await openAllowedFile(workspace, path);
  if (opened.status !== 200) return opened;
  try {
    return { status: 200, contents: new Uint8Array(await opened.file.readFile()) };
  } catch {
    return { status: 404 };
  } finally {
    await opened.file.close();
  }
}

/**
 * 파일에서 `rangeOf`가 고른 구간만 stream으로 읽습니다. 큰 영상도 메모리에 모두 올리지 않습니다.
 * `rangeOf`는 파일 크기를 받아 구간을 고르고, 크기를 벗어나 고를 수 없으면 null을 돌려줍니다.
 */
export async function readLocalFileRange(
  workspace: string,
  path: string,
  rangeOf: (size: number) => ByteRange | null,
): Promise<LocalFilePart> {
  const opened = await openAllowedFile(workspace, path);
  if (opened.status !== 200) return opened;
  const { file, size } = opened;
  const range = rangeOf(size);
  if (!range) {
    await file.close();
    return { status: 416, size };
  }
  // stream이 끝나거나 응답이 취소되면 autoClose로 파일을 닫습니다.
  const stream = file.createReadStream({ start: range.start, end: range.end });
  return {
    status: 206,
    size,
    range,
    contents: Readable.toWeb(stream) as ReadableStream<Uint8Array>,
  };
}

/** 허용 루트 안의 일반 파일만 엽니다. 연 파일은 호출한 쪽이 닫습니다. */
async function openAllowedFile(
  workspace: string,
  path: string,
): Promise<{ status: 200; file: FileHandle; size: number } | { status: 403 | 404 }> {
  const roots = await allowedRoots(workspace);
  let target: string;
  try {
    target = await realpath(path);
  } catch {
    return { status: 404 };
  }
  if (!roots.some((root) => contains(root, target))) return { status: 403 };
  let file: FileHandle;
  try {
    // macOS/Linux에서는 최종 경로가 검사 뒤 symlink로 바뀌었으면 O_NOFOLLOW로 열지 않습니다.
    // Windows의 fs.constants에는 O_NOFOLLOW와 O_NONBLOCK이 없어서 O_RDONLY로만 열립니다.
    file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch {
    return { status: 404 };
  }
  const stat = await statIfStillAt(file, target);
  if (stat?.isFile()) return { status: 200, file, size: Number(stat.size) };
  await file.close();
  return { status: 404 };
}

/**
 * 연 파일이 아직 `target` 경로에 있는 그 파일이면 연 파일의 stat을, 검사 뒤 경로가 symlink나 다른 파일로
 * 바뀌었으면 null을 돌려줍니다. O_NOFOLLOW가 없는 Windows에서는 이 확인이 symlink를 막습니다.
 * Windows의 파일 번호(ino)는 64bit라서 Number로는 정확히 나타내지 못할 수 있으므로 bigint로 비교합니다.
 */
async function statIfStillAt(file: FileHandle, target: string) {
  const [opened, current] = await Promise.all([
    file.stat({ bigint: true }),
    lstat(target, { bigint: true }),
  ]).catch(() => [null, null]);
  if (!opened || !current || current.isSymbolicLink()) return null;
  return opened.dev === current.dev && opened.ino === current.ino ? opened : null;
}

async function allowedRoots(workspace: string): Promise<string[]> {
  const [workspaceRoots, configured] = await Promise.all([
    gitRoots(workspace),
    // Linux에서 `/tmp`와 `tmpdir()`이 겹칠 때는 `resolveExisting`이 realpath로 정규화한 뒤 중복을 걸러냅니다.
    resolveExisting(nonWorkspaceRootCandidates()),
  ]);
  return [...workspaceRoots, ...configured];
}

/**
 * workspace와 그 git worktree 밖에서 허용하는 루트 후보입니다. 환경 변수를 따르므로 요청마다 읽습니다.
 * `platform`은 테스트에서 다른 OS의 규칙을 확인할 때만 넘깁니다.
 */
export function nonWorkspaceRootCandidates(platform: NodeJS.Platform = process.platform): string[] {
  const windows = platform === "win32";
  // 작업 에이전트 세션이 리포트 검증용 파일을 남기는 임시 디렉터리도 기본 허용 루트로 둡니다.
  // Windows는 `/tmp`를 서버 작업 디렉터리가 있는 드라이브의 루트 기준(`C:\tmp` 등)으로 풀어
  // 의도하지 않은 디렉터리가 허용되므로, 사용자별 `%TEMP%`인 `tmpdir()`만 둡니다.
  const tempDirs = windows ? [tmpdir()] : ["/tmp", "/var/tmp", tmpdir()];
  const path = windows ? win32 : posix;
  return [...tempDirs, path.join(homedir(), ".beads-starter"), ...configuredRoots(path)];
}

async function gitRoots(workspace: string): Promise<string[]> {
  const root = await realpath(workspace).catch(() => null);
  if (!root) return [];
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", root, "worktree", "list", "--porcelain", "-z"],
      {
        timeout: 5_000,
      },
    );
    const paths = stdout
      .split("\0")
      .filter((field) => field.startsWith("worktree "))
      .map((field) => field.slice(9));
    return [root, ...(await resolveExisting(paths))];
  } catch {
    // git 조회가 실패하면 workspace 밖으로 허용 범위를 넓히지 않습니다.
    return [root];
  }
}

/**
 * 사용자가 `BEADS_DESK_LOCAL_FILE_ROOTS`에 PATH처럼 구분자(`path.delimiter`)로 나열한 디렉터리입니다.
 * `~`, `~/`로 시작하는 경로는 홈 디렉터리 기준으로 풀고, Windows에서는 `~\`도 같이 풉니다.
 * 서버의 작업 디렉터리는 사용자가 명령을 실행한 곳이 아니므로, 상대 경로는 기준이 모호해 무시합니다.
 */
function configuredRoots(path: PlatformPath): string[] {
  return (process.env.BEADS_DESK_LOCAL_FILE_ROOTS ?? "")
    .split(path.delimiter)
    .map((root) =>
      root === "~" || root.startsWith("~/") || root.startsWith(`~${path.sep}`)
        ? path.join(homedir(), root.slice(1))
        : root,
    )
    .filter((root) => path.isAbsolute(root));
}

/** 없거나 realpath로 풀 수 없는 경로는 빼고, 나머지를 실제 경로의 중복 없이 돌려줍니다. */
async function resolveExisting(paths: string[]): Promise<string[]> {
  const resolved = await Promise.all(paths.map((path) => realpath(path).catch(() => null)));
  return [...new Set(resolved.filter((path): path is string => path !== null))];
}

function contains(root: string, target: string): boolean {
  if (!isAbsolute(target)) return false;
  const path = relative(root, target);
  return path === "" || (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}
