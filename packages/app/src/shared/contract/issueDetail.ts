import { ISSUE_LIST_PATH } from "./issueList";

export function issueDetailPath(issueId: string): string {
  return `${ISSUE_LIST_PATH}/${encodeURIComponent(issueId)}`;
}
