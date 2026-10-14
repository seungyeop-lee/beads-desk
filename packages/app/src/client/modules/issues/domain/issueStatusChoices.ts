import { ISSUE_STATUSES, type IssueStatus } from "@beads-desk/bd/issue";

/** decision은 열려 있으면 유효한 결정이고 닫히면 폐기되거나 대체된 결정이라, 작업 진행을 나타내는 상태는 고르지 않습니다. */
const DECISION_STATUSES: readonly IssueStatus[] = ["open", "closed"];

/**
 * 이슈 유형에 맞는 상태 선택지를 돌려줍니다.
 * bd CLI로는 유형과 관계없이 어떤 상태든 지정할 수 있으므로, 현재 상태가 선택지에 없으면 맨 앞에 넣어 그대로 보이게 합니다.
 */
export function statusChoices(issueType: string, current: string): string[] {
  const allowed: readonly string[] = issueType === "decision" ? DECISION_STATUSES : ISSUE_STATUSES;
  return allowed.includes(current) ? [...allowed] : [current, ...allowed];
}
