import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, isAbsolute, join, relative, sep } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type LocalFile = { status: 200; contents: Uint8Array<ArrayBuffer> } | { status: 403 | 404 };

export async function readLocalFile(workspace: string, path: string): Promise<LocalFile> {
  const roots = await allowedRoots(workspace);
  let target: string;
  try {
    target = await realpath(path);
  } catch {
    return { status: 404 };
  }
  if (!roots.some((root) => contains(root, target))) return { status: 403 };
  try {
    // 최종 경로가 검사 뒤 symlink로 바뀌었으면 열지 않습니다.
    const file = await open(
      target,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      if (!(await file.stat()).isFile()) return { status: 404 };
      return { status: 200, contents: new Uint8Array(await file.readFile()) };
    } finally {
      await file.close();
    }
  } catch {
    return { status: 404 };
  }
}

// 작업 에이전트 세션이 리포트 검증용 파일을 남기는 /tmp도 기본 허용 루트로 둡니다.
const TMP_ROOT = "/tmp";

async function allowedRoots(workspace: string): Promise<string[]> {
  const [workspaceRoots, configured] = await Promise.all([
    gitRoots(workspace),
    resolveExisting([TMP_ROOT, ...configuredRoots()]),
  ]);
  return [...workspaceRoots, ...configured];
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
 * 서버의 작업 디렉터리는 사용자가 명령을 실행한 곳이 아니므로, 상대 경로는 기준이 모호해 무시합니다.
 */
function configuredRoots(): string[] {
  return (process.env.BEADS_DESK_LOCAL_FILE_ROOTS ?? "")
    .split(delimiter)
    .map((path) => (path === "~" || path.startsWith("~/") ? join(homedir(), path.slice(1)) : path))
    .filter((path) => isAbsolute(path));
}

/** 없거나 realpath로 풀 수 없는 경로는 빼고, 나머지를 실제 경로로 돌려줍니다. */
async function resolveExisting(paths: string[]): Promise<string[]> {
  const resolved = await Promise.all(paths.map((path) => realpath(path).catch(() => null)));
  return resolved.filter((path): path is string => path !== null);
}

function contains(root: string, target: string): boolean {
  if (!isAbsolute(target)) return false;
  const path = relative(root, target);
  return path === "" || (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}
