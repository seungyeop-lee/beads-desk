import { NON_WORK_TYPES, type Issue } from "@beads-desk/bd/issue";

/**
 * 열린 작업 이슈만 가져갈 수 있다고 봅니다. 진행 중 이슈는 이미 누군가 가져갔고,
 * 에픽과 molecule은 하위 이슈를 묶는 이슈이며, 결정과 마일스톤은 직접 작업하지 않습니다.
 * bd는 기능(feature)을 task와 같은 수준의 작업 유형으로 다루므로, 기능은 하위 이슈가 있어도 가져갈 수 있습니다.
 */
export function canClaim({ status, issueType }: Pick<Issue, "status" | "issueType">): boolean {
  return status === "open" && !NON_WORK_TYPES.has(issueType);
}
