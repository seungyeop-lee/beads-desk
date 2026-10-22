import { WINDOWS_DRIVE_PATH } from "./drivePath";
import { localFilePathOf, localFileUrl } from "@/shared/contract/localFiles";
import { SCREEN_PATHS } from "@/shared/domain/screenPaths";
import { workspaceHref } from "@/shared/contract/workspaces";

// 화면 경로(`/epics`)는 문서를 보는 workspace의 화면으로 잇고, 그 밖의 앱 경로는 URL로 유지합니다.
// 나머지 절대경로와 Windows 드라이브 경로는 로컬 파일로 엽니다.
const APP_ROOTS: ReadonlySet<string> = new Set(["/w", "/api", "/_next"]);

/** 화면 경로와 로컬 파일은 문서를 보는 workspace를 기준으로 열므로, 그 workspace의 이름을 함께 받습니다. */
export function localMarkdownUrl(url: string, workspace: string): string {
  const path = decodedPath(url);
  if (WINDOWS_DRIVE_PATH.test(path)) return localFileUrl(path, workspace);
  const root = url.split(/[?#]/, 1)[0]!.split("/").slice(0, 2).join("/");
  if (!url.startsWith("/") || url.startsWith("//") || APP_ROOTS.has(root)) return url;
  if (SCREEN_PATHS.has(root)) return workspaceHref(workspace, url);
  return localFileUrl(path, workspace);
}

/**
 * 본문 링크를 새 탭에서 열지 정합니다. `address`는 localMarkdownUrl이 바꾼 주소입니다.
 * 로컬 파일과 외부 웹 주소는 새 탭에서 열어 보던 화면을 남기고, 앱 화면 주소는 지금 탭에서 이동합니다.
 */
export function opensInNewTab(address: string): boolean {
  return localFilePathOf(address) !== null || /^(https?:)?\/\//i.test(address);
}

function decodedPath(url: string): string {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
}
