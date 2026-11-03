import type { Stats } from "node:fs";
import { lstat, readdir, realpath, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { LocalFolderEntry } from "@/shared/contract/localFiles";
import { allowedRoots, contains } from "./readLocalFile";

/** 목록 순서에서 항목이 놓인 자리입니다. 다음 묶음은 이 자리보다 뒤에 놓이는 항목부터 읽습니다. */
export type FolderPosition = { folder: boolean; modifiedAt: number; name: string };

type LocalFolder =
  | { status: 200; entries: LocalFolderEntry[]; total: number; next: FolderPosition | null }
  | { status: 403 | 404 };

/**
 * 허용 루트 안의 폴더에서 이름이 `.`으로 시작하지 않는 항목을 목록 순서로 정렬해, after 자리 뒤의 항목을 limit개까지 돌려줍니다.
 * 목록 순서는 폴더가 먼저이고, 폴더와 나머지 항목은 각각 수정 시각 최신순, 수정 시각이 같으면 이름순입니다.
 * 묶음 사이에 새 항목이 생기거나 항목이 수정되면 그 항목은 받은 자리보다 앞에 놓이므로, 이미 받은 항목이 다음 묶음에 다시 나오지 않습니다.
 */
export async function listLocalFolder(
  workspace: string,
  path: string,
  after: FolderPosition | null,
  limit: number,
): Promise<LocalFolder> {
  const roots = await allowedRoots(workspace);
  const allowed = (target: string) => roots.some((root) => contains(root, target));
  let target: string;
  try {
    target = await realpath(path);
  } catch {
    return { status: 404 };
  }
  if (!allowed(target)) return { status: 403 };
  let names: string[];
  try {
    names = await readdir(target);
  } catch {
    // 파일이나 읽을 수 없는 폴더도 목록을 보일 폴더가 없는 것으로 답합니다.
    return { status: 404 };
  }
  const folder = resolve(path);
  const read = await Promise.all(
    names
      .filter((name) => !name.startsWith("."))
      .map((name) => folderEntry(name, join(target, name), join(folder, name), allowed)),
  );
  // 폴더를 읽은 뒤 지워진 항목은 null이라 뺍니다.
  const entries = read.filter((entry) => entry !== null);
  entries.sort((a, b) => comparePositions(positionOf(a), positionOf(b)));
  const rest = after
    ? entries.filter((entry) => comparePositions(positionOf(entry), after) > 0)
    : entries;
  const page = rest.slice(0, limit);
  return {
    status: 200,
    entries: page,
    total: entries.length,
    next: rest.length > limit ? positionOf(page.at(-1)!) : null,
  };
}

/**
 * 항목 하나의 종류와 크기, 수정 시각을 읽습니다. symlink는 가리키는 대상이 허용 루트 안에 있으면 대상의 값을 쓰고,
 * 밖에 있거나 대상이 없으면 대상을 읽지 않고 blocked로 돌려줍니다. 허용 루트 밖의 파일 정보를 내보내지 않기 위해서입니다.
 */
async function folderEntry(
  name: string,
  onDisk: string,
  path: string,
  allowed: (target: string) => boolean,
): Promise<LocalFolderEntry | null> {
  const own = await lstat(onDisk).catch(() => null);
  if (!own) return null;
  let info: Stats = own;
  if (own.isSymbolicLink()) {
    const target = await realpath(onDisk).catch(() => null);
    const linked = target && allowed(target) ? await stat(target).catch(() => null) : null;
    if (!linked) return { kind: "blocked", name, modifiedAt: own.mtimeMs };
    info = linked;
  }
  return info.isDirectory()
    ? { kind: "folder", name, path, modifiedAt: info.mtimeMs }
    : { kind: "file", name, path, size: info.size, modifiedAt: info.mtimeMs };
}

function positionOf(entry: LocalFolderEntry): FolderPosition {
  return { folder: entry.kind === "folder", modifiedAt: entry.modifiedAt, name: entry.name };
}

/** 목록 순서에서 a가 b보다 앞이면 음수, 뒤면 양수입니다. 이름은 locale과 관계없이 code unit 순서로 비교합니다. */
function comparePositions(a: FolderPosition, b: FolderPosition): number {
  if (a.folder !== b.folder) return a.folder ? -1 : 1;
  if (a.modifiedAt !== b.modifiedAt) return b.modifiedAt - a.modifiedAt;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}
