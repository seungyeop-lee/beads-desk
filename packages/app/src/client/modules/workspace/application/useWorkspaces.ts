import { documentMessages } from "@/client/infra/locale/documentLocale";
import { readWorkspaces } from "@/client/infra/workspaces/workspacesApiClient";
import { selectWorkspaceAction } from "@/server/web/workspaces/workspaceActions";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type { WorkspaceList } from "@/shared/contract/workspaces";
import { useWorkspaceRead, type WorkspaceReadState } from "./useWorkspaceRead";

/** 현재 workspace와 고를 수 있는 workspace 목록입니다. 다른 탭이나 CLI에서 바꿔도 다시 읽습니다. */
export function useWorkspaces(): WorkspaceReadState<WorkspaceList> {
  return useWorkspaceRead("workspaces", readWorkspaces);
}

/** 바꾸면 서버가 SSE로 알리고, 열려 있는 모든 화면이 새 workspace의 데이터를 다시 읽습니다. */
export async function selectWorkspace(root: string): Promise<ApiResponse<null>> {
  try {
    return await selectWorkspaceAction(root);
  } catch {
    return { ok: false, error: documentMessages().common.requestFailed };
  }
}
