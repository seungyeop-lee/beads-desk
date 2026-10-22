import { ISSUE_STATUSES } from "@beads-desk/bd/issue";
import { DECISION_STATUSES } from "@/client/modules/decisions/domain/decisionStatuses";

/**
 * 이슈 유형에 맞는 상태 선택지를 돌려줍니다.
 * bd CLI로는 유형과 관계없이 어떤 상태든 지정할 수 있으므로, 현재 상태가 선택지에 없으면 맨 앞에 넣어 그대로 보이게 합니다.
 */
export function statusChoices(issueType: string, current: string): string[] {
  const allowed: readonly string[] = issueType === "decision" ? DECISION_STATUSES : ISSUE_STATUSES;
  return allowed.includes(current) ? [...allowed] : [current, ...allowed];
}
