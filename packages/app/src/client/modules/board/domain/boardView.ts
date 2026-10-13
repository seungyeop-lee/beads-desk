import type { Issue, IssueStatus } from "@beads-desk/bd/issue";
import { byClosedDesc, byPriorityThenCreated } from "@/client/modules/issues/domain/issueListView";
import type { BoardColumn, BoardItem } from "@/shared/contract/board";

/** 닫힌 열에 보일 기간입니다. today는 오늘 0시부터입니다. */
export type ClosedWindow = "today" | "3d" | "7d";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 카드를 열에 놓으면 바꿀 상태입니다. */
export const DROP_STATUS: Record<BoardColumn, IssueStatus> = {
  blocked: "blocked",
  ready: "open",
  in_progress: "in_progress",
  closed: "closed",
  other: "deferred",
};

export type DropOutcome =
  | { kind: "none" }
  | { kind: "change"; status: IssueStatus }
  | { kind: "blockedByDependencies" };

/**
 * 카드를 놓았을 때 할 일을 정합니다.
 * 막힘 열의 카드는 대부분 의존 관계로 막힌 이슈라, 이미 그 상태인 열에 놓으면 bd가 바꿀 것이 없고 카드는 막힘 열로 돌아갑니다.
 */
export function dropOutcome(from: BoardColumn, to: BoardColumn, status: string): DropOutcome {
  if (from === to) return { kind: "none" };
  if (from === "blocked" && DROP_STATUS[to] === status) return { kind: "blockedByDependencies" };
  return { kind: "change", status: DROP_STATUS[to] };
}

/** 열마다 우선순위 순으로 정렬합니다. 닫힌 열은 기간 안에 닫은 이슈만 최근 것부터 보입니다. */
export function boardColumns(
  items: BoardItem[],
  closedWindow: ClosedWindow,
  /** 현재 시각(epoch ms)입니다. */
  now: number,
): Record<BoardColumn, Issue[]> {
  const columns: Record<BoardColumn, Issue[]> = {
    blocked: [],
    ready: [],
    in_progress: [],
    closed: [],
    other: [],
  };
  for (const { column, issue } of items) columns[column].push(issue);

  const since = closedSince(closedWindow, now);
  columns.closed = columns.closed.filter((issue) => (issue.closedAt ?? -Infinity) >= since);
  columns.closed.sort(byClosedDesc);
  for (const column of ["blocked", "ready", "in_progress", "other"] as const) {
    columns[column].sort(byPriorityThenCreated);
  }
  return columns;
}

function closedSince(closedWindow: ClosedWindow, now: number): number {
  if (closedWindow === "today") {
    const today = new Date(now);
    return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  }
  return now - (closedWindow === "3d" ? 3 : 7) * DAY_MS;
}
