import type { IssueDetail } from "@beads-desk/bd/issue";
import { readIssueDetail } from "@/client/infra/issues/issueApiClient";
import {
  useWorkspaceRead,
  type WorkspaceReadState,
} from "@/client/modules/workspace/application/useWorkspaceRead";

export function useIssueDetail(issueId: string): WorkspaceReadState<IssueDetail> {
  return useWorkspaceRead(issueId, readIssueDetail);
}
