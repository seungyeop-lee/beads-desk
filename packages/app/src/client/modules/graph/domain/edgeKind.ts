import { isHumanGateAwait } from "@beads-desk/bd/issue";

import type { AuxiliaryEdge } from "./centerGraph";
import type { GraphLayout, PlacedEdge } from "./graphLayout";

/** 그래프에 그리는 간선 종류입니다. 배열 순서대로 범례에 보입니다. */
export const EDGE_KINDS = ["blocks", "gate", "humanGate", "related", "discovered"] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

/** 간선 하나의 표현입니다. resolved는 선행 이슈가 닫혀 더는 막지 않는 관계이고, 관련·발견 간선은 늘 false입니다. */
export type EdgeLook = { kind: EdgeKind; resolved: boolean };

/** 화살촉이 선을 따라 덮는 길이입니다. 간선의 마지막 구간이 이보다 짧으면 선이 화살촉 옆으로 들어가는 것처럼 보입니다. */
export const ARROW_LENGTH = 12;

/** 끝에 화살촉을 그리는 종류입니다. 방향이 없는 관련 간선은 어느 쪽으로 향하는지가 없으므로 화살촉을 그리지 않습니다. */
const ARROWED_KINDS: ReadonlySet<EdgeKind> = new Set(["blocks", "gate", "humanGate", "discovered"]);

/** 이 종류의 간선이 끝에 화살촉을 그리는지입니다. */
export function hasArrow(kind: EdgeKind): boolean {
  return ARROWED_KINDS.has(kind);
}

/**
 * 배치한 blocks 간선의 표현입니다. 한쪽 끝이 gate이면 그 gate의 종류로, 선행 이슈(from)가 닫혔으면 해소된 관계로 그립니다.
 * gate끼리 이어지면 선행 쪽 gate의 종류를 따릅니다.
 */
export function blocksEdgeLook(
  layout: GraphLayout,
  { from, to }: Pick<PlacedEdge, "from" | "to">,
): EdgeLook {
  const issueOf = (id: string) => layout.nodeOf.get(id)!.issue;
  const blocker = issueOf(from);
  const resolved = blocker.status === "closed";
  const gate = [blocker, issueOf(to)].find(({ issueType }) => issueType === "gate");
  if (!gate) return { kind: "blocks", resolved };
  return { kind: isHumanGateAwait(gate) ? "humanGate" : "gate", resolved };
}

export function auxiliaryEdgeLook(relation: AuxiliaryEdge["type"]): EdgeLook {
  return { kind: relation === "related" ? "related" : "discovered", resolved: false };
}

/** 그래프에 그리는 간선의 종류를 범례 순서대로 돌려줍니다. looks는 그래프에 그린 blocks 간선의 표현입니다. */
export function edgeKindsIn(
  looks: readonly EdgeLook[],
  auxiliary: readonly AuxiliaryEdge[],
): EdgeKind[] {
  const kinds = new Set([
    ...looks.map(({ kind }) => kind),
    ...auxiliary.map(({ type }) => auxiliaryEdgeLook(type).kind),
  ]);
  return EDGE_KINDS.filter((kind) => kinds.has(kind));
}
