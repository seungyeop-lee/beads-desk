import { NON_WORK_TYPES, type Issue } from "@beads-desk/bd/issue";

const UNCLAIMABLE_TYPES: ReadonlySet<string> = new Set([...NON_WORK_TYPES, "feature"]);

/**
 * 열린 작업 이슈만 가져갈 수 있다고 봅니다. 진행 중 이슈는 이미 누군가 가져갔고,
 * 에픽과 기능은 하위 이슈를 묶는 이슈이며, 결정은 직접 작업하지 않습니다.
 */
export function canClaim({ status, issueType }: Pick<Issue, "status" | "issueType">): boolean {
  return status === "open" && !UNCLAIMABLE_TYPES.has(issueType);
}
