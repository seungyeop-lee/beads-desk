import { pathName, pathSeparatorsOf } from "@/shared/domain/localFiles/localPaths";

/** 폴더 화면의 경로 표시줄에 놓이는 폴더 하나입니다. */
export type FolderTrailStep = { name: string; path: string };

/**
 * 경로 표시줄에 보일 폴더를 base부터 path까지 순서대로 돌려줍니다. base보다 위의 폴더는 넣지 않습니다.
 * 주소를 직접 고쳐 path가 base 아래가 아니면 path 하나만 돌려줍니다.
 */
export function folderTrail(base: string, path: string): FolderTrailStep[] {
  const { separator, name } = pathSeparatorsOf(base);
  const step = (stepPath: string): FolderTrailStep => ({
    name: pathName(stepPath),
    path: stepPath,
  });
  const rest = path.slice(base.length);
  const underBase =
    path.startsWith(base) &&
    (rest === "" || separator.test(rest[0]!) || separator.test(base.at(-1) ?? ""));
  if (!underBase) return [step(path)];
  return [
    step(base),
    ...[...rest.matchAll(name)].map((match) =>
      step(path.slice(0, base.length + match.index + match[0].length)),
    ),
  ];
}

const SIZE_UNITS = ["KB", "MB", "GB", "TB"];

/** 파일 크기를 1024 단위로 줄여 `127 B`, `11.5 KB`처럼 보입니다. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  let value = bytes / 1024;
  let unit = 0;
  // 반올림한 값이 1024가 되면 `1024.0 KB` 대신 다음 단위로 올립니다.
  while (Number(value.toFixed(1)) >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${SIZE_UNITS[unit]}`;
}
