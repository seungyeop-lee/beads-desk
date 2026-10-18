import type { Issue } from "@beads-desk/bd/issue";
import type { EpicSummary } from "@/shared/contract/epics";
import { sortEpics } from "@/client/modules/epics/domain/epicsView";
import { waiterCounts } from "@/shared/domain/issues/waiterCounts";
import { groupByWorkState, type WorkState } from "@/client/modules/issues/domain/workState";

/** 다음에 할 일에 보이는 바로 작업 가능 이슈의 개수입니다. 나머지는 이슈 목록의 바로 작업 가능 탭에서 봅니다. */
export const NEXT_UP_LIMIT = 5;

export type FocusView = {
  inProgress: Issue[];
  /** 우선순위, 대기 수가 많은 순, 만든 시각 순입니다. 다음에 할 일은 앞에서 NEXT_UP_LIMIT개만 보입니다. */
  ready: Issue[];
  blocked: Issue[];
  /** 이슈 id마다 대기 수입니다. 0이면 담지 않습니다. */
  waiters: ReadonlyMap<string, number>;
  /** 닫히지 않은 epic을 진행 중인 것부터 보입니다. */
  openEpics: EpicSummary[];
};

/**
 * 지금 화면에 보일 이슈를 작업 상태로 나눕니다.
 * 결정은 이슈 목록의 처음 유형 선택처럼 빼서, 개수가 이슈 목록 보기 탭의 처음 개수와 같습니다.
 */
export function focusView(issues: Issue[], epics: EpicSummary[]): FocusView {
  const waiters = waiterCounts(issues);
  const groups = groupByWorkState(
    issues.filter((issue) => issue.issueType !== "decision"),
    waiters,
  );
  const of = (state: WorkState) => groups.find((group) => group.state === state)?.issues ?? [];
  return {
    inProgress: of("in_progress"),
    ready: of("ready"),
    blocked: of("blocked"),
    waiters,
    openEpics: sortEpics(epics).filter(({ epic }) => epic.status !== "closed"),
  };
}
