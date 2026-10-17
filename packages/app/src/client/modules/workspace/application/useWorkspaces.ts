import { useSyncExternalStore } from "react";
import { documentMessages } from "@/client/infra/locale/documentLocale";
import { readWorkspaces } from "@/client/infra/workspaces/workspacesApiClient";
import { selectWorkspaceAction } from "@/server/web/workspaces/workspaceActions";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type { WorkspaceList } from "@/shared/contract/workspaces";
import { shareWorkspaceRead } from "./shareWorkspaceRead";
import type { WorkspaceReadState } from "./useWorkspaceRead";

// 이 hook을 쓰는 component가 한 화면에 여럿이어도 알림 한 번에 한 번만 읽도록 결과를 나눠 씁니다.
const workspaces = shareWorkspaceRead(readWorkspaces);

/** 현재 workspace와 고를 수 있는 workspace 목록입니다. 다른 탭이나 CLI에서 바꿔도 다시 읽습니다. */
export function useWorkspaces(): WorkspaceReadState<WorkspaceList> {
  return useSyncExternalStore(
    workspaces.subscribe,
    workspaces.getSnapshot,
    workspaces.getServerSnapshot,
  );
}

/** 바꾸면 서버가 SSE로 알리고, 열려 있는 모든 화면이 새 workspace의 데이터를 다시 읽습니다. */
export async function selectWorkspace(root: string): Promise<ApiResponse<null>> {
  try {
    return await selectWorkspaceAction(root);
  } catch {
    return { ok: false, error: documentMessages().common.requestFailed };
  }
}
