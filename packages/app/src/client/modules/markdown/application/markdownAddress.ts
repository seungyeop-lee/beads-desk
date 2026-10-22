import { documentWorkspace } from "@/client/infra/workspaces/documentWorkspace";
import { localMarkdownUrl } from "../domain/localMarkdownUrl";

/**
 * markdown 본문의 주소를 지금 탭이 보는 workspace에서 여는 앱 주소로 바꿉니다. 바꿀 주소가 아니면 그대로 돌려줍니다.
 * 편집기가 링크와 그림을 그릴 때마다 부르므로 browser에서만 실행됩니다.
 */
export function tabMarkdownUrl(url: string): string {
  return localMarkdownUrl(url, documentWorkspace() ?? "");
}
