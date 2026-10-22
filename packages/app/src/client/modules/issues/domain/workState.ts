import { workState, type Issue, type WorkState } from "@beads-desk/bd/issue";
import { nestUnderParents } from "./issueListView";
import { byClosedDesc, byPriority, byPriorityThenCreated } from "./issueSort";

// 작업 상태 판정은 보드와 함께 쓰도록 @beads-desk/bd/issue에 두고, 이 모듈은 판정 결과로 화면에 보일 묶음과 순서를 정합니다.
export { workState, type WorkState };

/** 묶음을 보이는 순서입니다. 지금 손대고 있는 것과 바로 시작할 수 있는 것을 먼저 보입니다. */
export const WORK_STATE_ORDER: WorkState[] = [
  "in_progress",
  "ready",
  "blocked",
  "awaiting_human",
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

/**
 * 작업 상태로 묶어 WORK_STATE_ORDER 순서로 돌려주고, 빈 묶음은 뺍니다. 닫힘은 최근에 닫은 순, 나머지는 우선순위와 만든 시각 순입니다.
 * 바로 작업 가능은 같은 우선순위 안에서 대기 수(waiters)가 많은 이슈를 앞에 둡니다. 사용자가 매긴 우선순위는 넘지 않으면서, 먼저 끝내면 가장 많은 일이 풀리는 이슈를 위로 올립니다.
 */
export function groupByWorkState(
  issues: Issue[],
  waiters: ReadonlyMap<string, number>,
): WorkStateGroup[] {
  const byPriorityThenWaiters = (a: Issue, b: Issue) =>
    byPriority(a, b) ||
    (waiters.get(b.id) ?? 0) - (waiters.get(a.id) ?? 0) ||
    byPriorityThenCreated(a, b);
  return WORK_STATE_ORDER.map((state) => ({
    state,
    issues: issues
      .filter((issue) => workState(issue) === state)
      .sort(
        state === "closed"
          ? byClosedDesc
          : state === "ready"
            ? byPriorityThenWaiters
            : byPriorityThenCreated,
      ),
  })).filter((group) => group.issues.length > 0);
}

/** 이슈 목록의 묶음입니다. groupByWorkState의 묶음마다 하위 이슈를 같은 묶음에 있는 상위 이슈 바로 아래로 옮깁니다. */
export function issueListGroups(
  issues: Issue[],
  waiters: ReadonlyMap<string, number>,
): WorkStateGroup[] {
  return groupByWorkState(issues, waiters).map((group) => ({
    ...group,
    issues: nestUnderParents(group.issues),
  }));
}
