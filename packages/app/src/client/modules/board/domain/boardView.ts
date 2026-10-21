import type { Issue, IssueStatus } from "@beads-desk/bd/issue";
import { byClosedDesc, byPriorityThenCreated } from "@/client/modules/issues/domain/issueListView";
import type { BoardColumn, BoardItem } from "@/shared/contract/board";

/** 닫힌 열에 보일 기간입니다. today는 오늘 0시부터입니다. */
export type ClosedWindow = "today" | "3d" | "7d" | "30d";

const DAY_MS = 24 * 60 * 60 * 1000;
const CLOSED_WINDOW_DAYS: Record<Exclude<ClosedWindow, "today">, number> = {
  "3d": 3,
  "7d": 7,
  "30d": 30,
};

/** 카드를 열에 놓으면 바꿀 상태입니다. */
const DROP_STATUS: Record<Exclude<BoardColumn, "blocked">, IssueStatus> = {
  ready: "open",
  in_progress: "in_progress",
  closed: "closed",
};

/** 막힘 열은 기다리는 이슈를 보이기만 합니다. 놓으면 사유 없이 저장 상태만 blocked가 되므로 받지 않습니다. */
export function acceptsDrop(column: BoardColumn): column is Exclude<BoardColumn, "blocked"> {
  return column !== "blocked";
}

export type DropOutcome =
  | { kind: "none" }
  | { kind: "change"; status: IssueStatus }
  | { kind: "blockedByDependencies" };

/**
 * 카드를 놓았을 때 할 일을 정합니다.
 * 막힘 열의 카드는 대부분 의존 관계로 막힌 이슈라, 이미 그 상태인 열에 놓으면 bd가 바꿀 것이 없고 카드는 막힘 열로 돌아갑니다.
 */
export function dropOutcome(from: BoardColumn, to: BoardColumn, status: string): DropOutcome {
  if (from === to || !acceptsDrop(to)) return { kind: "none" };
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
  };
  for (const { column, issue } of items) columns[column].push(issue);

  const since = closedSince(closedWindow, now);
  columns.closed = columns.closed.filter((issue) => (issue.closedAt ?? -Infinity) >= since);
  columns.closed.sort(byClosedDesc);
  for (const column of ["blocked", "ready", "in_progress"] as const) {
    columns[column].sort(byPriorityThenCreated);
  }
  return columns;
}

/**
 * 닫힌 열에 남길 이슈의 닫힌 시각 하한입니다. today는 오늘 현지 자정부터이고, 3d·7d·30d는 지금부터 N×24시간 전부터입니다.
 * 나머지 기간은 "지금으로부터 N일 안에 닫힌 이슈"를 보여 주는 것이 의도이므로, 날짜 필터의 자정 경계(localDayRange)에 맞추지 않습니다.
 */
function closedSince(closedWindow: ClosedWindow, now: number): number {
  if (closedWindow === "today") {
    const today = new Date(now);
    return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  }
  return now - CLOSED_WINDOW_DAYS[closedWindow] * DAY_MS;
}
