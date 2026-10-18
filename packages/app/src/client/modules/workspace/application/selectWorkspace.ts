import { documentMessages } from "@/client/infra/locale/documentLocale";
import { selectWorkspaceAction } from "@/server/web/workspaces/workspaceActions";
import type { ApiResponse } from "@/shared/contract/apiResponse";

/** 바꾸면 서버가 SSE로 알리고, 열려 있는 모든 화면이 새 workspace의 데이터를 다시 읽습니다. */
export async function selectWorkspace(root: string): Promise<ApiResponse<null>> {
  try {
    return await selectWorkspaceAction(root);
  } catch {
    return { ok: false, error: documentMessages().common.requestFailed };
  }
}
