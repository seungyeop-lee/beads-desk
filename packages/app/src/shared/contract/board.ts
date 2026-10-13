import type { Issue } from "@beads-desk/bd/issue";

export const BOARD_PATH = "/api/board";

/** 화면 왼쪽부터 보이는 순서입니다. */
export const BOARD_COLUMNS = ["blocked", "ready", "in_progress", "closed"] as const;

export type BoardColumn = (typeof BOARD_COLUMNS)[number];

/** 한 이슈는 한 열에만 들어갑니다. */
export type BoardItem = { column: BoardColumn; issue: Issue };
