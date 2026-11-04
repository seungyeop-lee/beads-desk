import { pathSeparatorsOf } from "@/shared/domain/localFiles/localPaths";

/** `https:`, `mailto:` 같은 scheme입니다. 드라이브 문자로 시작하는 Windows 경로(`C:\a.md`, `C:a.md`)도 여기에 걸려 그대로 둡니다. */
const SCHEME = /^[a-z][a-z\d+.-]*:/i;

/**
 * 파일로 연 마크다운 문서 안의 상대 경로 주소를, 그 문서(`documentPath`)가 든 폴더를 기준으로 한 절대 경로로 풉니다.
 * scheme이 있는 주소, `/`로 시작하는 주소(절대 경로와 `//` 주소), `#`로 시작하는 문서 안 anchor는 그대로 둡니다.
 * 경로 뒤의 `?`나 `#` 부분은 떼고, 경로 이름마다 percent-encoding을 decode한 뒤에 풉니다.
 * 결과는 localMarkdownUrl이 decodeURI로 다시 decode하므로, `%`가 든 파일 이름이 바뀌지 않게 encodeURI로 encode해 돌려줍니다.
 */
export function documentRelativeUrl(url: string, documentPath: string): string {
  const [path] = url.split(/[?#]/, 1);
  if (!path || path.startsWith("/") || SCHEME.test(path)) return url;
  const { separator } = pathSeparatorsOf(documentPath);
  // 첫 이름은 루트(macOS·Linux는 빈 이름, Windows는 `C:`)이고, `..`로도 지우지 않습니다.
  const parts = documentPath.split(separator).slice(0, -1);
  for (const part of path.split(separator).map(decodedName)) {
    if (part === "..") {
      if (parts.length > 1) parts.pop();
    } else if (part !== "." && part !== "") {
      parts.push(part);
    }
  }
  const joiner = documentPath.startsWith("/") ? "/" : "\\";
  return encodeURI(parts.length === 1 ? parts[0] + joiner : parts.join(joiner));
}

function decodedName(name: string): string {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}
