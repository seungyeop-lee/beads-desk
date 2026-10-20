import { useSyncExternalStore } from "react";
import { readWorkspaces } from "@/client/infra/workspaces/workspacesApiClient";
import type { WorkspaceList } from "@/shared/contract/workspaces";
import { shareWorkspaceRead } from "./shareWorkspaceRead";
import type { WorkspaceReadState } from "./useWorkspaceRead";

// 이 hook을 쓰는 component가 한 화면에 여럿이어도 알림 한 번에 한 번만 읽도록 결과를 나눠 씁니다.
const workspaces = shareWorkspaceRead(readWorkspaces);

/** 등록한 workspace 목록입니다. CLI로 workspace를 등록하면 다시 읽습니다. */
export function useWorkspaces(): WorkspaceReadState<WorkspaceList> {
  return useSyncExternalStore(
    workspaces.subscribe,
    workspaces.getSnapshot,
    workspaces.getServerSnapshot,
  );
}
