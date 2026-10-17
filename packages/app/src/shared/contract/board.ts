import type { BoardColumn, Issue } from "@beads-desk/bd/issue";

export type { BoardColumn };

export const BOARD_PATH = "/api/board";

/**
 * 화면 왼쪽부터 보이는 열 순서입니다.
 * 열 구성은 bd의 BoardColumn이 정하므로, 이 배열은 BoardColumn의 값을 빠짐없이 한 번씩 담아야 typecheck를 통과합니다.
 */
export const BOARD_COLUMNS = [
  "blocked",
  "ready",
  "in_progress",
  "closed",
] as const satisfies EveryOrder<BoardColumn>;

/** 한 이슈는 한 열에만 들어갑니다. */
export type BoardItem = { column: BoardColumn; issue: Issue };

/** U의 값을 빠짐없이 한 번씩 담는 모든 순서의 tuple입니다. */
type EveryOrder<U, Each = U> = [U] extends [never]
  ? readonly []
  : Each extends U
    ? readonly [Each, ...EveryOrder<Exclude<U, Each>>]
    : never;
