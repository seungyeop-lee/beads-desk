import type { Issue } from "@beads-desk/bd/issue";

/**
 * 저장 상태와 의존 관계, bd ready를 합쳐 지금 이 이슈로 무엇을 할 수 있는지 나타냅니다. 보드의 열과 같은 기준입니다.
 * 이슈를 작업 상태로 나눠 보이는 화면은 모두 이 기준을 씁니다(결정 bd-desk-2s1).
 */
export type WorkState = "in_progress" | "ready" | "blocked" | "deferred" | "closed" | "other";

/** epic과 decision은 직접 작업하지 않으므로 진행 중이나 열림이어도 in_progress, ready로 보지 않습니다. */
const NON_WORK_TYPES = new Set(["epic", "decision"]);

/** blockedBy와 ready는 목록 조회가 채운 값입니다. 의존 관계 때문에 막힌 이슈는 저장 상태와 관계없이 blocked입니다. */
export function workState(issue: Issue): WorkState {
  if (issue.status === "closed") return "closed";
  if (issue.status === "blocked" || (issue.blockedBy?.length ?? 0) > 0) return "blocked";
  if (issue.status === "deferred") return "deferred";
  if (NON_WORK_TYPES.has(issue.issueType)) return "other";
  if (issue.status === "in_progress") return "in_progress";
  if (issue.status === "open" && issue.ready) return "ready";
  return "other";
}
