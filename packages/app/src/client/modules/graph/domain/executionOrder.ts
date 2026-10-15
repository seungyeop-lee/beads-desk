import type { Issue, IssueDependency } from "@beads-desk/bd/issue";
import { byPriorityThenCreated } from "@/client/modules/issues/domain/issueListView";

/** from을 먼저 끝내야 to를 시작할 수 있습니다. */
export type OrderEdge = { from: string; to: string };

/** blocks 관계로 이어진 이슈 묶음입니다. layers[0]은 묶음 안에서 바로 시작할 수 있는 이슈입니다. */
export type OrderComponent = { layers: Issue[][]; edges: OrderEdge[] };

export type ExecutionOrder = {
  /** 이슈가 많은 묶음부터 둡니다. */
  components: OrderComponent[];
  /** 주어진 이슈 가운데 blocks 관계가 없어 그리지 않는 이슈의 수입니다. */
  unrelated: number;
};

/**
 * 주어진 이슈 사이의 blocks 관계로 실행 순서를 정합니다. 목록 밖 이슈와의 관계는 버립니다.
 * layer는 먼저 끝나야 하는 이슈를 따라간 가장 긴 경로입니다. 서로 기다리는 순환은 한 layer에 함께 둡니다.
 */
export function executionOrder(issues: Issue[], dependencies: IssueDependency[]): ExecutionOrder {
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const edges = blockingEdges(byId, dependencies);
  const linked = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  const components = connectedGroups(
    issues.filter((issue) => linked.has(issue.id)),
    edges,
  )
    .map((group) => orderComponent(group, edges))
    .sort((a, b) => issueCount(b) - issueCount(a));
  return { components, unrelated: issues.length - linked.size };
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

function connectedGroups(issues: Issue[], edges: OrderEdge[]): Issue[][] {
  const root = new Map(issues.map((issue) => [issue.id, issue.id]));
  const find = (id: string): string => {
    const parent = root.get(id)!;
    if (parent === id) return id;
    const top = find(parent);
    root.set(id, top);
    return top;
  };
  for (const { from, to } of edges) root.set(find(from), find(to));

  const groups = new Map<string, Issue[]>();
  for (const issue of issues) {
    const key = find(issue.id);
    groups.set(key, [...(groups.get(key) ?? []), issue]);
  }
  return [...groups.values()];
}

function orderComponent(group: Issue[], allEdges: OrderEdge[]): OrderComponent {
  const ids = new Set(group.map((issue) => issue.id));
  const edges = allEdges.filter((edge) => ids.has(edge.from));
  const layerOf = longestPathLayers(group, edges);

  const layers: Issue[][] = [];
  for (const issue of group) (layers[layerOf.get(issue.id)!] ??= []).push(issue);

  // 앞 layer에서의 위치를 기록하며 내려가, 기다리는 이슈들의 위치 평균으로 다음 layer를 정렬합니다.
  const position = new Map<string, number>();
  layers.forEach((layer, index) => {
    const anchor = (issue: Issue) => {
      const before = edges
        .filter((edge) => edge.to === issue.id && layerOf.get(edge.from)! < index)
        .map((edge) => position.get(edge.from)!);
      return before.length > 0 ? before.reduce((sum, at) => sum + at, 0) / before.length : 0;
    };
    layer.sort((a, b) => anchor(a) - anchor(b) || byPriorityThenCreated(a, b));
    layer.forEach((issue, at) => position.set(issue.id, at));
  });
  return { layers, edges };
}

/** 강하게 연결된 묶음(순환)을 한 단위로 보고, 순환이 없는 그래프에서 가장 긴 경로로 layer를 정합니다. */
function longestPathLayers(group: Issue[], edges: OrderEdge[]): Map<string, number> {
  const next = new Map<string, string[]>();
  for (const { from, to } of edges) next.set(from, [...(next.get(from) ?? []), to]);

  // Tarjan 알고리즘은 다른 묶음에서 이어지는 묶음을 먼저 내보내므로, 내보낸 순서를 뒤집으면 위상 순서입니다.
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const sccOf = new Map<string, number>();
  const sccs: string[][] = [];
  const visit = (id: string) => {
    index.set(id, index.size);
    low.set(id, index.get(id)!);
    stack.push(id);
    onStack.add(id);
    for (const to of next.get(id) ?? []) {
      if (!index.has(to)) {
        visit(to);
        low.set(id, Math.min(low.get(id)!, low.get(to)!));
      } else if (onStack.has(to)) {
        low.set(id, Math.min(low.get(id)!, index.get(to)!));
      }
    }
    if (low.get(id) === index.get(id)) {
      const scc: string[] = [];
      let member: string;
      do {
        member = stack.pop()!;
        onStack.delete(member);
        sccOf.set(member, sccs.length);
        scc.push(member);
      } while (member !== id);
      sccs.push(scc);
    }
  };
  for (const issue of group) if (!index.has(issue.id)) visit(issue.id);

  const sccLayer = sccs.map(() => 0);
  for (let scc = sccs.length - 1; scc >= 0; scc--) {
    for (const id of sccs[scc]!) {
      for (const to of next.get(id) ?? []) {
        const target = sccOf.get(to)!;
        if (target !== scc) sccLayer[target] = Math.max(sccLayer[target]!, sccLayer[scc]! + 1);
      }
    }
  }
  return new Map(group.map((issue) => [issue.id, sccLayer[sccOf.get(issue.id)!]!]));
}

function issueCount(component: OrderComponent): number {
  return component.layers.reduce((sum, layer) => sum + layer.length, 0);
}
