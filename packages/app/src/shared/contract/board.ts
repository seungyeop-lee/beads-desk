import type { Issue, WorkState } from "@beads-desk/bd/issue";
import type { EveryOrder } from "./everyOrder";

/** 보드에 열이 있는 작업 상태입니다. workState가 정하는 값 중 화면이 열로 보이는 것입니다. */
export type BoardColumn = Extract<WorkState, "blocked" | "ready" | "in_progress" | "closed">;

export const BOARD_PATH = "/api/board";

/**
 * 화면 왼쪽부터 보이는 열 순서입니다.
 * 이 배열은 BoardColumn의 값을 빠짐없이 한 번씩 담아야 typecheck를 통과합니다.
 */
export const BOARD_COLUMNS = [
  "blocked",
  "ready",
  "in_progress",
  "closed",
] as const satisfies EveryOrder<BoardColumn>;

/** 보드의 한 칸에 놓인 이슈입니다. 한 이슈는 한 열에만 들어갑니다. */
export type BoardItem = { column: BoardColumn; issue: Issue };
