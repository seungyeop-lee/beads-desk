import type { Issue } from "@beads-desk/bd/issue";
import { byClosedDesc, byPriorityThenCreated, nestUnderParents } from "./issueListView";

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

/** 묶음을 보이는 순서입니다. 지금 손대고 있는 것과 바로 시작할 수 있는 것을 먼저 보입니다. */
export const WORK_STATE_ORDER: WorkState[] = [
  "in_progress",
  "ready",
  "blocked",
  "other",
  "deferred",
  "closed",
];

/** 이슈 목록의 보기 탭에서 하나만 골라 볼 수 있는 작업 상태입니다. other는 전체 보기에서만 보입니다. */
export const VIEW_STATES: WorkState[] = ["in_progress", "ready", "blocked", "deferred", "closed"];

/** 주소의 view 값을 보기 탭의 작업 상태로 읽습니다. 없거나 알 수 없는 값이면 전체 보기인 null입니다. */
export function parseViewState(value: string | null): WorkState | null {
  return VIEW_STATES.find((state) => state === value) ?? null;
}

export type WorkStateGroup = { state: WorkState; issues: Issue[] };

/** 작업 상태로 묶어 WORK_STATE_ORDER 순서로 돌려주고, 빈 묶음은 뺍니다. 닫힘은 최근에 닫은 순, 나머지는 우선순위와 만든 시각 순입니다. */
export function groupByWorkState(issues: Issue[]): WorkStateGroup[] {
  return WORK_STATE_ORDER.map((state) => ({
    state,
    issues: issues
      .filter((issue) => workState(issue) === state)
      .sort(state === "closed" ? byClosedDesc : byPriorityThenCreated),
  })).filter((group) => group.issues.length > 0);
}

/** 이슈 목록의 묶음입니다. groupByWorkState의 묶음마다 하위 이슈를 같은 묶음에 있는 상위 이슈 바로 아래로 옮깁니다. */
export function issueListGroups(issues: Issue[]): WorkStateGroup[] {
  return groupByWorkState(issues).map((group) => ({
    ...group,
    issues: nestUnderParents(group.issues),
  }));
}
