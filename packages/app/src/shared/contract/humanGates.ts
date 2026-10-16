import type { Issue } from "@beads-desk/bd/issue";

export const HUMAN_GATES_PATH = "/api/human-gates";

/** 사람이 닫아야 풀리는 열린 gate입니다. gate는 bd gate create가 만드는 별도 이슈입니다. */
export type HumanGateSummary = {
  gate: Issue;
  /** gate를 만들 때 남긴 사유입니다. 없으면 빈 문자열입니다. */
  reason: string;
  /** 이 gate가 막고 있는 닫히지 않은 이슈입니다. */
  blocks: Issue[];
};
