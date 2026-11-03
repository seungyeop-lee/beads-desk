/** 폴더 화면의 경로 표시줄에 놓이는 폴더 하나입니다. */
export type FolderTrailStep = { name: string; path: string };

/** 서버 OS의 경로 구분자입니다. Windows는 `\`와 `/`를 모두 구분자로 받습니다. */
const POSIX_SEPARATORS = { separator: /\//, name: /[^/]+/g };
const WINDOWS_SEPARATORS = { separator: /[/\\]/, name: /[^/\\]+/g };

/**
 * 경로 표시줄에 보일 폴더를 base부터 path까지 순서대로 돌려줍니다. base보다 위의 폴더는 넣지 않습니다.
 * 주소를 직접 고쳐 path가 base 아래가 아니면 path 하나만 돌려줍니다.
 */
export function folderTrail(base: string, path: string): FolderTrailStep[] {
  const { separator, name } = separatorsOf(base);
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

/** 경로의 마지막 이름(파일이나 폴더 이름)입니다. 루트처럼 이름이 없는 경로는 경로를 그대로 돌려줍니다. */
export function pathName(path: string): string {
  return path.split(separatorsOf(path).separator).findLast((part) => part !== "") ?? path;
}

/** 경로는 서버 OS의 형식이므로, `/`로 시작하면 macOS·Linux 경로로, 아니면 Windows 경로(`C:\...`)로 봅니다. */
function separatorsOf(path: string) {
  return path.startsWith("/") ? POSIX_SEPARATORS : WINDOWS_SEPARATORS;
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
