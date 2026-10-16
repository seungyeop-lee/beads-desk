import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { isAbsolute, relative, sep } from "node:path";
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

async function allowedRoots(workspace: string): Promise<string[]> {
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
    const resolved = await Promise.all(paths.map((path) => realpath(path).catch(() => null)));
    return [root, ...resolved.filter((path): path is string => path !== null)];
  } catch {
    // git 조회가 실패하면 workspace 밖으로 허용 범위를 넓히지 않습니다.
    return [root];
  }
}

function contains(root: string, target: string): boolean {
  if (!isAbsolute(target)) return false;
  const path = relative(root, target);
  return path === "" || (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}
