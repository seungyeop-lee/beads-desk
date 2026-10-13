import type { Issue } from "@beads-desk/bd/issue";

export const DECISIONS_PATH = "/api/decisions";

export type DecisionSummary = {
  decision: Issue;
  /** 이 decision을 대체한 이슈의 id입니다. 대체되지 않았으면 null입니다. */
  supersededBy: string | null;
};
