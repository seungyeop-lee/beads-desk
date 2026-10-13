import { byClosedDesc } from "@/client/modules/issues/domain/issueListView";
import type { DecisionSummary } from "@/shared/contract/decisions";

export type DecisionRow = DecisionSummary & {
  /** 이 decision이 대체한 decision의 id입니다. 화면에 보이는 순서를 따릅니다. */
  supersedes: string[];
};

/**
 * 아직 유효한 decision과 닫힌 decision을 나눕니다.
 * 유효한 decision은 최근에 만든 것부터, 닫힌 decision은 최근에 닫은 것부터 보입니다.
 */
export function decisionGroups(summaries: DecisionSummary[]): {
  current: DecisionRow[];
  retired: DecisionRow[];
} {
  const current = summaries
    .filter(({ decision }) => decision.status !== "closed")
    .sort((a, b) => b.decision.createdAt - a.decision.createdAt);
  const retired = summaries
    .filter(({ decision }) => decision.status === "closed")
    .sort((a, b) => byClosedDesc(a.decision, b.decision));

  const supersedes = new Map<string, string[]>();
  for (const { decision, supersededBy } of [...current, ...retired]) {
    if (supersededBy) {
      supersedes.set(supersededBy, [...(supersedes.get(supersededBy) ?? []), decision.id]);
    }
  }
  const withSupersedes = (summary: DecisionSummary): DecisionRow => ({
    ...summary,
    supersedes: supersedes.get(summary.decision.id) ?? [],
  });
  return { current: current.map(withSupersedes), retired: retired.map(withSupersedes) };
}
