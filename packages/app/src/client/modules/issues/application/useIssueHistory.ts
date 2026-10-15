import type { IssueEvent } from "@beads-desk/bd/issue";
import { readIssueHistory } from "@/client/infra/issues/issueApiClient";
import {
  useWorkspaceRead,
  type WorkspaceReadState,
} from "@/client/modules/workspace/application/useWorkspaceRead";

/** 이슈의 변경 이벤트를 읽고, workspace가 바뀌면 다시 읽습니다. 활동 탭을 열 때만 쓰도록 탭 안에서 호출합니다. */
export function useIssueHistory(issueId: string): WorkspaceReadState<IssueEvent[]> {
  return useWorkspaceRead(issueId, readIssueHistory);
}
