import { NON_WORK_TYPES, workState, type Issue, type WorkState } from "@beads-desk/bd/issue";
import { BOARD_COLUMNS, type BoardColumn } from "@/shared/domain/board/boardColumns";
import type { BoardItem } from "@/shared/contract/board";

/** 보드에 열이 있는 작업 상태인지 확인합니다. BOARD_COLUMNS가 모든 열을 한 번씩 담고 있으므로 이것으로 판정합니다. */
function isBoardColumn(state: WorkState): state is BoardColumn {
  return (BOARD_COLUMNS as readonly WorkState[]).includes(state);
}

/**
 * 이슈를 작업 상태로 보드 항목으로 나눕니다. 열이 없는 작업 상태(보류, 판단 기다림, other)의 이슈는 넣지 않습니다.
 * decision, epic, milestone은 작업 상태와 관계없이 보드에 넣지 않습니다.
 */
export function boardItemsOf(issues: readonly Issue[]): BoardItem[] {
  return issues
    .filter((issue) => !NON_WORK_TYPES.has(issue.issueType))
    .flatMap((issue): BoardItem[] => {
      const state = workState(issue);
      return isBoardColumn(state) ? [{ column: state, issue }] : [];
    });
}
