import { awaitsHumanDecision, type Issue } from "@beads-desk/bd/issue";

export type AwaitingHuman<G, Q> = {
  gates: readonly G[];
  /** 닫히지 않았고 human 라벨이 붙은 이슈입니다. 유형과 작업 상태는 따지지 않습니다. */
  questions: Q[];
  count: number;
};

/**
 * 사람 판단을 기다리는 일을 모읍니다. 열린 human gate와, 닫히지 않았고 human 라벨이 붙은 이슈입니다.
 * 판단 기다림 개수를 보이는 곳은 모두 이 함수로 세야 서로 개수가 어긋나지 않습니다.
 * bd list는 gate를 돌려주지 않으므로 열린 human gate는 이슈 목록과 따로 받습니다.
 */
export function awaitingHuman<G, Q extends Pick<Issue, "status" | "labels">>(
  openHumanGates: readonly G[],
  issues: readonly Q[],
): AwaitingHuman<G, Q> {
  const questions = issues.filter(awaitsHumanDecision);
  return { gates: openHumanGates, questions, count: openHumanGates.length + questions.length };
}
