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
};

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

function closedSince(closedWindow: ClosedWindow, now: number): number {
  if (closedWindow === "today") {
    const today = new Date(now);
    return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  }
  return now - (closedWindow === "3d" ? 3 : 7) * DAY_MS;
}
