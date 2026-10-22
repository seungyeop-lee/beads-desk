import type { Issue } from "@beads-desk/bd/issue";
import type { BoardColumn } from "@/shared/domain/board/boardColumns";

export const BOARD_PATH = "/api/board";

/** 보드의 한 칸에 놓인 이슈입니다. 한 이슈는 한 열에만 들어갑니다. */
export type BoardItem = { column: BoardColumn; issue: Issue };
