import type { Issue } from "@beads-desk/bd/issue";
import { readEpicChildren, readEpics } from "@/client/infra/epics/epicsApiClient";
import {
  useWorkspaceRead,
  type WorkspaceReadState,
} from "@/client/modules/workspace/application/useWorkspaceRead";
import type { EpicSummary } from "@/shared/contract/epics";

export function useEpics(): WorkspaceReadState<EpicSummary[]> {
  return useWorkspaceRead("epics", readEpics);
}

/** 펼친 epic만 하위 이슈를 읽고, 접으면 다시 읽지 않습니다. */
export function useEpicChildren(epicId: string): WorkspaceReadState<Issue[]> {
  return useWorkspaceRead(epicId, readEpicChildren);
}
