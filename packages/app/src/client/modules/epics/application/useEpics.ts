import { readEpicDescendants, readEpics } from "@/client/infra/epics/epicsApiClient";
import {
  useWorkspaceRead,
  type WorkspaceReadState,
} from "@/client/modules/workspace/application/useWorkspaceRead";
import type { EpicDescendants, EpicSummary } from "@/shared/contract/epics";

export function useEpics(): WorkspaceReadState<EpicSummary[]> {
  return useWorkspaceRead("epics", readEpics);
}

/** 펼친 epic만 후손 이슈를 읽고, 접으면 다시 읽지 않습니다. */
export function useEpicDescendants(epicId: string): WorkspaceReadState<EpicDescendants> {
  return useWorkspaceRead(epicId, readEpicDescendants);
}
