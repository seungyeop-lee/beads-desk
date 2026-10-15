import type { Issue, IssueDetail } from "@beads-desk/bd/issue";
import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { issueDetailPath } from "@/shared/contract/issueDetail";
import {
  descriptionSearchPath,
  ISSUE_LIST_PATH,
  issueListSearchParams,
  type IssueListFilter,
} from "@/shared/contract/issueList";

export function readIssueList(filter: IssueListFilter): Promise<ApiResponse<Issue[]>> {
  const query = issueListSearchParams(filter).toString();
  return readApi(query ? `${ISSUE_LIST_PATH}?${query}` : ISSUE_LIST_PATH);
}

export function readIssueDetail(issueId: string): Promise<ApiResponse<IssueDetail>> {
  return readApi(issueDetailPath(issueId));
}

export function readDescriptionMatches(text: string): Promise<ApiResponse<string[]>> {
  return readApi(descriptionSearchPath(text));
}
