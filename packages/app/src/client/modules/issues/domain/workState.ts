import { workState, type Issue, type WorkState } from "@beads-desk/bd/issue";
import { nestUnderParents } from "./issueListView";
import { matchesQuery, normalizeQuery } from "./issueSearch";
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

/**
 * 이슈 목록의 묶음입니다. groupByWorkState의 묶음마다 하위 이슈를 같은 묶음에 있는 상위 이슈 바로 아래로 옮깁니다.
 * 검색어가 있으면 묶음마다 id나 제목이 맞은 이슈를 나머지보다 앞에 두고, 상하위 배치는 같은 쪽 이슈끼리만 합니다.
 * issues는 refineIssues가 같은 검색어로 거른 목록이어야, 뒤에 놓이는 나머지가 본문·댓글에서만 맞은 이슈가 됩니다.
 */
export function issueListGroups(
  issues: Issue[],
  waiters: ReadonlyMap<string, number>,
  search = "",
): WorkStateGroup[] {
  const query = normalizeQuery(search);
  return groupByWorkState(issues, waiters).map((group) => {
    if (query === "") return { ...group, issues: nestUnderParents(group.issues) };
    const hits = group.issues.filter((issue) => matchesQuery(issue, query));
    const rest = group.issues.filter((issue) => !matchesQuery(issue, query));
    return { ...group, issues: [...nestUnderParents(hits), ...nestUnderParents(rest)] };
  });
}
