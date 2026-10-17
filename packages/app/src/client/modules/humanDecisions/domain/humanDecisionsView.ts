import type { AwaitingHuman, Issue } from "@beads-desk/bd/issue";
import { byId } from "@/client/modules/issues/domain/issueListView";
import type { HumanGateSummary } from "@/shared/contract/humanGates";

/**
 * 판단 기다림 화면의 순서로 확인 요청과 질문을 정렬합니다. 각 묶음마다 요청 시각 내림차순으로
 * 가장 최근 요청이 맨 위에 옵니다. gate 이슈를 만든 시각이 확인 요청 시각이고, 질문 이슈를 만든
 * 시각이 질문 시각입니다. bd가 만든 시각을 초 단위로 기록하므로 같은 초에 만든 항목은 id 오름차순으로
 * 두어 화면 순서가 항상 같게 합니다.
 */
export function sortByRequestedAt(
  awaiting: AwaitingHuman<HumanGateSummary, Issue>,
): AwaitingHuman<HumanGateSummary, Issue> {
  return {
    ...awaiting,
    gates: [...awaiting.gates].sort((a, b) => byRequestedAt(a.gate, b.gate)),
    questions: [...awaiting.questions].sort(byRequestedAt),
  };
}

/** 확인 요청과 질문이 같은 규칙으로 정렬되게 하는 판단 요청 시각순 비교자입니다. */
export function byRequestedAt(a: Issue, b: Issue): number {
  return b.createdAt - a.createdAt || byId(a, b);
}
