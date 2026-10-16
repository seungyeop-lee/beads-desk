import { SCREEN_TABS } from "@/client/ui/shell/screenTabs";
import { localFileUrl } from "@/shared/contract/localFiles";

// 앱 route는 URL로 유지하고, 그 밖의 절대경로는 로컬 파일로 엽니다.
const APP_ROOTS: ReadonlySet<string> = new Set([
  "/",
  "/graph",
  "/api",
  "/_next",
  ...SCREEN_TABS.map((tab) => tab.href),
]);

export function localMarkdownUrl(url: string): string {
  const root = url.split(/[?#]/, 1)[0]!.split("/").slice(0, 2).join("/");
  if (!url.startsWith("/") || url.startsWith("//") || APP_ROOTS.has(root)) return url;
  try {
    return localFileUrl(decodeURI(url));
  } catch {
    return localFileUrl(url);
  }
}
