import type { HumanGate } from "@beads-desk/bd/types";

export type { PreviousGateRound } from "@beads-desk/bd/types";

export const HUMAN_GATES_PATH = "/api/human-gates";

export function previousGateRoundsPath(gateId: string): string {
  return `${HUMAN_GATES_PATH}/${encodeURIComponent(gateId)}/previous-gates`;
}

/** 사람이 닫아야 풀리는 열린 gate입니다. gate는 bd gate create가 만드는 별도 이슈입니다. */
export type HumanGateSummary = HumanGate;
