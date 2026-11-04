import { documentWorkspace } from "@/client/infra/workspaces/documentWorkspace";
import { documentRelativeUrl } from "../domain/documentRelativeUrl";
import { localMarkdownUrl } from "../domain/localMarkdownUrl";

/**
 * markdown 본문의 주소를 지금 탭이 보는 workspace에서 여는 앱 주소로 바꿉니다. 바꿀 주소가 아니면 그대로 돌려줍니다.
 * 편집기가 링크와 그림을 그릴 때마다 부르므로 browser에서만 실행됩니다.
 */
export function tabMarkdownUrl(url: string): string {
  return localMarkdownUrl(url, documentWorkspace() ?? "");
}

/**
 * documentPath의 마크다운 파일을 그릴 때 쓰는 tabMarkdownUrl입니다. 상대 경로 주소는 그 파일이 든 폴더를 기준으로 먼저 풉니다.
 * 이슈 본문처럼 파일이 아닌 마크다운에는 기준 폴더가 없으므로 tabMarkdownUrl을 그대로 씁니다.
 */
export function documentMarkdownUrl(documentPath: string): (url: string) => string {
  return (url) => tabMarkdownUrl(documentRelativeUrl(url, documentPath));
}
