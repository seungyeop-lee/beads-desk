/** 서버 OS의 경로 구분자입니다. Windows는 `\`와 `/`를 모두 구분자로 받습니다. */
const POSIX_SEPARATORS = { separator: /\//, name: /[^/]+/g };
const WINDOWS_SEPARATORS = { separator: /[/\\]/, name: /[^/\\]+/g };

/** 경로는 서버 OS의 형식이므로, `/`로 시작하면 macOS·Linux 경로로, 아니면 Windows 경로(`C:\...`)로 봅니다. */
export function pathSeparatorsOf(path: string) {
  return path.startsWith("/") ? POSIX_SEPARATORS : WINDOWS_SEPARATORS;
}

/** 경로의 마지막 이름(파일이나 폴더 이름)입니다. 루트처럼 이름이 없는 경로는 경로를 그대로 돌려줍니다. */
export function pathName(path: string): string {
  return path.split(pathSeparatorsOf(path).separator).findLast((part) => part !== "") ?? path;
}
