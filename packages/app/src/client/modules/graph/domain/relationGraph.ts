import type { Issue, IssueDependency } from "@beads-desk/bd/issue";
import { type LayeredGraph, layeredGraph } from "./layeredGraph";

/** 전체 관계 탭이 선 모양을 나누는 단위입니다. bd의 그 밖의 의존 유형은 other 하나로 그립니다. */
export const RELATION_KINDS = ["blocks", "parent-child", "related", "other"] as const;
export type RelationKind = (typeof RELATION_KINDS)[number];

/** bd가 방향 없이 쓰는 의존 유형입니다. */
const UNDIRECTED_TYPES = new Set(["related", "relates-to"]);

export function relationKind(type: string): RelationKind {
  if (type === "blocks" || type === "parent-child") return type;
  return UNDIRECTED_TYPES.has(type) ? "related" : "other";
}

/** to가 from에 type으로 의존합니다. related는 방향이 없어, from과 to는 bd에 기록한 순서를 따를 뿐입니다. */
export type RelationEdge = { from: string; to: string; type: string; kind: RelationKind };

export type RelationGraph = LayeredGraph<RelationEdge>;

/**
 * 주어진 이슈 사이의 모든 의존 관계로 묶음을 나눕니다. 목록 밖 이슈와의 관계는 버립니다.
 * 의존받는 이슈(상위 이슈, 먼저 끝낼 이슈, 발견한 곳)를 왼쪽 layer에 둡니다.
 * related도 기록한 방향대로 layer를 나눕니다. 같은 layer의 두 이슈를 잇는 선은 노드 뒤로 거꾸로 돌아가 읽기 어렵기 때문입니다.
 */
export function relationGraph(issues: Issue[], dependencies: IssueDependency[]): RelationGraph {
  const ids = new Set(issues.map((issue) => issue.id));
  const seen = new Set<string>();
  const edges = dependencies.flatMap(({ issueId, dependsOnId, type }): RelationEdge[] => {
    if (issueId === dependsOnId || !ids.has(issueId) || !ids.has(dependsOnId)) return [];
    const kind = relationKind(type);
    const pair = kind === "related" ? [issueId, dependsOnId].sort() : [dependsOnId, issueId];
    const key = `${type}\n${pair.join("\n")}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ from: dependsOnId, to: issueId, type, kind }];
  });
  return layeredGraph(issues, edges);
}
