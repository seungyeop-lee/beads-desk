"use server";

import { selectWorkspace } from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";

/**
 * 등록한 workspace를 현재 workspace로 바꿉니다. 현재 workspace는 서버 전체에서 하나이므로 다른 탭과 창도 함께 바뀝니다.
 * 바뀌면 열려 있는 SSE 연결이 새 workspace를 감시하면서 invalidate를 보냅니다.
 */
export async function selectWorkspaceAction(root: string): Promise<ApiResponse<null>> {
  if (typeof root !== "string") return { ok: false, error: "요청 형식이 올바르지 않습니다." };
  return selectWorkspace(root)
    ? { ok: true, data: null }
    : { ok: false, error: `등록되지 않은 workspace입니다: ${root}` };
}
