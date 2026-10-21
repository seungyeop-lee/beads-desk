import { SCREEN_TABS } from "@/client/ui/shell/screenTabs";
import { localFileUrl } from "@/shared/contract/localFiles";
import { workspaceHref } from "@/shared/contract/workspaces";

// 화면 경로(`/epics`)는 문서를 보는 workspace의 화면으로 잇고, 그 밖의 앱 경로는 URL로 유지합니다.
// 나머지 절대경로와 Windows 드라이브 경로는 로컬 파일로 엽니다.
const SCREEN_ROOTS: ReadonlySet<string> = new Set([
  "/",
  "/graph",
  ...SCREEN_TABS.map((tab) => tab.href),
]);
const APP_ROOTS: ReadonlySet<string> = new Set(["/w", "/api", "/_next"]);
// 드라이브 문자 뒤에 구분자까지 있어야 경로로 봅니다. `x:y` 같은 한 글자 scheme의 URL과
// 드라이브 상대 경로(`C:a.md`)는 그대로 둡니다.
export const WINDOWS_DRIVE_PATH = /^[a-z]:[\\/]/i;

/** 화면 경로와 로컬 파일은 문서를 보는 workspace를 기준으로 열므로, 그 workspace의 이름을 함께 받습니다. */
export function localMarkdownUrl(url: string, workspace: string): string {
  const path = decodedPath(url);
  if (WINDOWS_DRIVE_PATH.test(path)) return localFileUrl(path, workspace);
  const root = url.split(/[?#]/, 1)[0]!.split("/").slice(0, 2).join("/");
  if (!url.startsWith("/") || url.startsWith("//") || APP_ROOTS.has(root)) return url;
  if (SCREEN_ROOTS.has(root)) return workspaceHref(workspace, url);
  return localFileUrl(path, workspace);
}

function decodedPath(url: string): string {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
}
