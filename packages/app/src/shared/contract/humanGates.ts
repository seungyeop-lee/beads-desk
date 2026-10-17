import type { Issue, IssueComment } from "@beads-desk/bd/issue";

export const HUMAN_GATES_PATH = "/api/human-gates";

export function previousGateRoundsPath(gateId: string): string {
  return `${HUMAN_GATES_PATH}/${encodeURIComponent(gateId)}/previous-gates`;
}

/** 사람이 닫아야 풀리는 열린 gate입니다. gate는 bd gate create가 만드는 별도 이슈입니다. */
export type HumanGateSummary = {
  gate: Issue;
  /** gate를 만들 때 남긴 사유입니다. 없으면 빈 문자열입니다. */
  reason: string;
  /** 이 gate가 막고 있는 닫히지 않은 이슈입니다. */
  blocks: Issue[];
  /** 지금 gate가 막는 작업을 이전에 막았던 닫힌 gate 수입니다. */
  previousGateCount: number;
};

/** 지금 gate와 같은 작업을 막았던 닫힌 gate(이전 라운드)와 그 라운드에 남긴 기록입니다. */
export type PreviousGateRound = {
  gate: Issue;
  /** gate를 닫을 때 bd가 남긴 사유입니다. */
  closeReason: string | null;
  comments: IssueComment[];
};
