import type { GraphData } from "@/shared/contract/graph";
import { executionOrder } from "./executionOrder";
import { blockingChainIssues, scopedIssues } from "./graphScope";

export type AuxiliaryEdge = { from: string; to: string; type: "related" | "discovered-from" };

/** 보조 관계는 기준에서 한 번만 따라가며, blocks 사슬의 순서 계산에는 넣지 않습니다. */
export function centerGraph(data: GraphData, centerId: string) {
  const chain = blockingChainIssues(data.issues, data.dependencies, centerId);
  const chainIds = new Set(chain.map(({ id }) => id));
  const issues = scopedIssues(data, { kind: "center", id: centerId });
  const ids = new Set(issues.map(({ id }) => id));
  const seen = new Set<string>();
  const auxiliary: AuxiliaryEdge[] = data.dependencies.flatMap(({ issueId, dependsOnId, type }) => {
    if (type !== "related" && type !== "discovered-from") return [];
    if (issueId !== centerId && dependsOnId !== centerId) return [];
    if (issueId === dependsOnId || !ids.has(issueId) || !ids.has(dependsOnId)) return [];
    const pair = type === "related" ? [issueId, dependsOnId].sort() : [dependsOnId, issueId];
    const key = `${type}:${pair.join(":")}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ from: pair[0]!, to: pair[1]!, type }];
  });
  return {
    order: executionOrder(chain, data.dependencies),
    extra: issues.filter(({ id }) => !chainIds.has(id)),
    auxiliary,
  };
}
