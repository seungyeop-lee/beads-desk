import { WORKSPACE_QUERY } from "./workspaces";

export const LOCAL_FILES_PATH = "/api/local-files";

/** workspace는 허용 범위를 정하는 workspace를 화면 주소의 이름으로 가리킵니다. */
export function localFileUrl(path: string, workspace: string): string {
  return `${LOCAL_FILES_PATH}?${new URLSearchParams({ path, [WORKSPACE_QUERY]: workspace })}`;
}

/** localFileUrl로 만든 주소이면 그 주소가 여는 파일 경로를, 아니면 null을 돌려줍니다. */
export function localFilePathOf(url: string): string | null {
  const queryStart = url.indexOf("?");
  if (queryStart < 0 || url.slice(0, queryStart) !== LOCAL_FILES_PATH) return null;
  return new URLSearchParams(url.slice(queryStart + 1)).get("path");
}
