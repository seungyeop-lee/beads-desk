import type { Issue, IssueDependency } from "@beads-desk/bd/issue";
import { type LayeredComponent, type LayeredGraph, layeredGraph } from "./layeredGraph";

/** from을 먼저 끝내야 to를 시작할 수 있습니다. */
export type OrderEdge = { from: string; to: string };

/** blocks 관계로 이어진 이슈 묶음입니다. layers[0]은 묶음 안에서 바로 시작할 수 있는 이슈입니다. */
export type OrderComponent = LayeredComponent<OrderEdge>;

/** 이슈가 많은 묶음부터 둡니다. unlinked는 주어진 이슈 사이에 blocks 관계가 없는 이슈이고, cycles는 서로 기다리는 순환의 경로입니다. */
export type ExecutionOrder = LayeredGraph<OrderEdge>;

/**
 * 주어진 이슈 사이의 blocks 관계로 실행 순서를 정합니다. 목록 밖 이슈와의 관계는 버립니다.
 * layer는 먼저 끝나야 하는 이슈를 따라간 가장 긴 경로입니다. 서로 기다리는 순환은 한 layer에 함께 둡니다.
 */
export function executionOrder(issues: Issue[], dependencies: IssueDependency[]): ExecutionOrder {
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  return layeredGraph(issues, blockingEdges(byId, dependencies));
}

function blockingEdges(byId: Map<string, Issue>, dependencies: IssueDependency[]): OrderEdge[] {
  const seen = new Set<string>();
  return dependencies.flatMap(({ issueId, dependsOnId, type }) => {
    const key = `${dependsOnId}\n${issueId}`;
    if (type !== "blocks" || issueId === dependsOnId || seen.has(key)) return [];
    if (!byId.has(issueId) || !byId.has(dependsOnId)) return [];
    seen.add(key);
    return [{ from: dependsOnId, to: issueId }];
  });
}

/**
 * 묶음의 열에서 gate를 뺀 작업 열입니다. gate만 남는 열은 지우고, 묶음에 작업이 없으면 빈 배열입니다.
 * gate는 작업 단계가 아니라 대기 조건이므로, 그래프는 gate를 막는 작업 아래에 두고 이 열 번호를 단계 번호로 씁니다.
 */
export function workLayers({ layers }: OrderComponent): Issue[][] {
  return layers
    .map((layer) => layer.filter(({ issueType }) => issueType !== "gate"))
    .filter((layer) => layer.length > 0);
}
