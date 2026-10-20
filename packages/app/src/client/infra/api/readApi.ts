import { documentMessages } from "@/client/infra/locale/documentLocale";
import { documentWorkspace } from "@/client/infra/workspaces/documentWorkspace";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { WORKSPACE_QUERY } from "@/shared/contract/workspaces";

/**
 * beads-desk API를 GET으로 읽습니다. 연결하지 못하거나 응답 형식이 다르면 실패 결과를 돌려줍니다.
 * workspace를 query로 붙여, 서버가 그 workspace에서 bd를 실행하게 합니다. 생략하면 이 탭이 보는 workspace입니다.
 */
export async function readApi<T>(
  path: string,
  workspace = documentWorkspace(),
): Promise<ApiResponse<T>> {
  let response: Response;
  try {
    response = await fetch(withWorkspace(path, workspace), { cache: "no-store" });
  } catch {
    return { ok: false, error: documentMessages().common.serverUnreachable };
  }
  try {
    const body: unknown = await response.json();
    if (isApiResponse(body)) return body as ApiResponse<T>;
  } catch {
    // 아래의 형식 오류로 처리합니다.
  }
  return { ok: false, error: documentMessages().common.unreadableResponse };
}

function isApiResponse(value: unknown): boolean {
  if (typeof value !== "object" || value === null || !("ok" in value)) return false;
  if (value.ok === true) return "data" in value;
  return value.ok === false && "error" in value && typeof value.error === "string";
}

function withWorkspace(path: string, workspace: string | null): string {
  if (workspace === null) return path;
  const query = new URLSearchParams({ [WORKSPACE_QUERY]: workspace });
  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
}
