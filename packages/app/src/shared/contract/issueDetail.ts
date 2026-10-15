import { ISSUE_LIST_PATH } from "./issueList";

export function issueDetailPath(issueId: string): string {
  return `${ISSUE_LIST_PATH}/${encodeURIComponent(issueId)}`;
}

/** 이슈의 변경 이벤트 목록입니다. */
export function issueHistoryPath(issueId: string): string {
  return `${issueDetailPath(issueId)}/history`;
}
