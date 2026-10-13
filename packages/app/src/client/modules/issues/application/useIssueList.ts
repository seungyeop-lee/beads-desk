import type { Issue } from "@beads-desk/bd/issue";
import { readIssueList } from "@/client/infra/issues/issueApiClient";
import {
  useWorkspaceRead,
  type WorkspaceReadState,
} from "@/client/modules/workspace/application/useWorkspaceRead";
import type { IssueListFilter } from "@/shared/contract/issueList";

/** filter는 렌더링마다 새로 만들지 말고 state로 유지해 넘깁니다. 바뀔 때마다 다시 구독합니다. */
export function useIssueList(filter: IssueListFilter): WorkspaceReadState<Issue[]> {
  return useWorkspaceRead(filter, readIssueList);
}
