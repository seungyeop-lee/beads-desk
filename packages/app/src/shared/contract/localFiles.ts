import { WORKSPACE_QUERY } from "./workspaces";

export const LOCAL_FILES_PATH = "/api/local-files";

/** workspace는 허용 범위를 정하는 workspace를 화면 주소의 이름으로 가리킵니다. */
export function localFileUrl(path: string, workspace: string): string {
  return `${LOCAL_FILES_PATH}?${new URLSearchParams({ path, [WORKSPACE_QUERY]: workspace })}`;
}
