import type { Issue, IssueDetail, IssueEvent } from "@beads-desk/bd/issue";
import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { issueDetailPath, issueHistoryPath } from "@/shared/contract/issueDetail";
import {
  ISSUE_LIST_PATH,
  issueListSearchParams,
  issueTextSearchPath,
  type IssueListFilter,
  type IssueTextMatch,
} from "@/shared/contract/issueList";

export function readIssueList(filter: IssueListFilter): Promise<ApiResponse<Issue[]>> {
  const query = issueListSearchParams(filter).toString();
  return readApi(query ? `${ISSUE_LIST_PATH}?${query}` : ISSUE_LIST_PATH);
}

export function readIssueDetail(issueId: string): Promise<ApiResponse<IssueDetail>> {
  return readApi(issueDetailPath(issueId));
}

export function readIssueHistory(issueId: string): Promise<ApiResponse<IssueEvent[]>> {
  return readApi(issueHistoryPath(issueId));
}

export function readIssueTextMatches(text: string): Promise<ApiResponse<IssueTextMatch[]>> {
  return readApi(issueTextSearchPath(text));
}
