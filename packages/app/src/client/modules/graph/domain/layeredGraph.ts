import type { Issue } from "@beads-desk/bd/issue";
import { byPriorityThenCreated } from "@/client/modules/issues/domain/issueListView";

/** from을 to보다 왼쪽 layer에 두는 간선입니다. */
export type LayerEdge = { from: string; to: string };

/**
 * layer 안에서 한 줄을 차지하는 자리입니다. 이슈가 놓이거나, 두 layer 이상 떨어진 이슈를 잇는 간선이 지나갑니다.
 * 간선이 지나가는 자리는 layer 안 순서를 처음 정할 때만 씁니다. 그래프 화면은 이 자리를 그리지 않고 간선을 따로 잇습니다.
 */
export type LayerSlot<E extends LayerEdge> = { issue: Issue } | { passing: E };

/** 간선으로 이어진 이슈 묶음입니다. layers[0]은 묶음 안에서 가장 왼쪽에 두는 자리이고, 위에서 아래 순서입니다. */
export type LayeredComponent<E extends LayerEdge> = { layers: LayerSlot<E>[][]; edges: E[] };

export type LayeredGraph<E extends LayerEdge> = {
  /** 이슈가 많은 묶음부터 둡니다. */
  components: LayeredComponent<E>[];
  /** 주어진 이슈 가운데 간선이 없어 어느 묶음에도 들지 않은 이슈입니다. 주어진 순서를 따릅니다. */
  unlinked: Issue[];
  /** 간선을 따라 돌아오는 순환마다 한 경로입니다. 경로는 출발한 이슈로 끝납니다(예: [a, b, a]). */
  cycles: string[][];
};

/**
 * 간선으로 이어진 이슈를 묶음으로 나누고, 묶음마다 간선을 따라 layer를 정합니다.
 * layer는 간선을 따라간 가장 긴 경로입니다. 순환하는 이슈는 한 layer에 함께 둡니다.
 */
export function layeredGraph<E extends LayerEdge>(issues: Issue[], edges: E[]): LayeredGraph<E> {
  const linked = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
  const laid = connectedGroups(
    issues.filter((issue) => linked.has(issue.id)),
    edges,
  )
    .map((group) => layeredComponent(group, edges))
    .sort((a, b) => issueCount(b.component) - issueCount(a.component));
  return {
    components: laid.map(({ component }) => component),
    unlinked: issues.filter((issue) => !linked.has(issue.id)),
    cycles: laid.flatMap(({ cycles }) => cycles),
  };
}

function connectedGroups(issues: Issue[], edges: LayerEdge[]): Issue[][] {
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

function layeredComponent<E extends LayerEdge>(
  group: Issue[],
  allEdges: E[],
): { component: LayeredComponent<E>; cycles: string[][] } {
  const ids = new Set(group.map((issue) => issue.id));
  const edges = allEdges.filter((edge) => ids.has(edge.from));
  const next = new Map<string, string[]>();
  for (const { from, to } of edges) next.set(from, [...(next.get(from) ?? []), to]);
  const sccs = stronglyConnected(group, next);
  const layerOf = longestPathLayers(sccs, next);

  const layers: LayerSlot<E>[][] = [];
  for (const issue of group) (layers[layerOf.get(issue.id)!] ??= []).push({ issue });
  for (const edge of edges) {
    for (let at = layerOf.get(edge.from)! + 1; at < layerOf.get(edge.to)!; at++) {
      layers[at]!.push({ passing: edge });
    }
  }

  // 앞 layer에서의 위치를 기록하며 내려가, 바로 앞 layer에서 이어지는 자리들의 위치 평균으로 다음 layer를 정렬합니다.
  // 간선이 지나가는 자리도 이슈와 함께 정렬해야, 건너뛰는 간선이 다른 간선과 덜 엇갈립니다.
  const position = new Map<string, number>();
  const slotKey = (slot: LayerSlot<E>, layer: number) =>
    "issue" in slot ? slot.issue.id : passingKey(slot.passing, layer);
  // 간선이 layer에 들어오기 직전 자리는, 바로 앞 layer가 출발 이슈의 layer이면 그 이슈이고 아니면 그 간선이 지나간 자리입니다.
  const enteringFrom = (edge: E, layer: number) =>
    position.get(layerOf.get(edge.from) === layer - 1 ? edge.from : passingKey(edge, layer - 1))!;
  layers.forEach((layer, index) => {
    const anchor = (slot: LayerSlot<E>) => {
      const before =
        "issue" in slot
          ? edges
              .filter((edge) => edge.to === slot.issue.id && layerOf.get(edge.from)! < index)
              .map((edge) => enteringFrom(edge, index))
          : [enteringFrom(slot.passing, index)];
      return before.length > 0 ? before.reduce((sum, at) => sum + at, 0) / before.length : 0;
    };
    layer.sort((a, b) => anchor(a) - anchor(b) || slotOrder(a, b, layerOf));
    layer.forEach((slot, at) => position.set(slotKey(slot, index), at));
  });
  const cycles = sccs.filter((scc) => scc.length > 1).map((scc) => cyclePath(scc, next));
  return { component: { layers, edges }, cycles };
}

/**
 * 강하게 연결된 묶음(순환)을 Tarjan 알고리즘으로 찾습니다. 순환하지 않는 이슈는 혼자 한 묶음입니다.
 * Tarjan 알고리즘은 다른 묶음에서 이어지는 묶음을 먼저 내보내므로, 돌려준 순서를 뒤집으면 위상 순서입니다.
 * 묶음의 마지막 이슈는 그 묶음에서 처음 방문한 이슈입니다.
 */
function stronglyConnected(group: Issue[], next: ReadonlyMap<string, string[]>): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
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
        scc.push(member);
      } while (member !== id);
      sccs.push(scc);
    }
  };
  for (const issue of group) if (!index.has(issue.id)) visit(issue.id);
  return sccs;
}

/** 강하게 연결된 묶음(순환)을 한 단위로 보고, 순환이 없는 그래프에서 가장 긴 경로로 layer를 정합니다. */
function longestPathLayers(
  sccs: string[][],
  next: ReadonlyMap<string, string[]>,
): Map<string, number> {
  const sccOf = new Map(sccs.flatMap((scc, at) => scc.map((id) => [id, at] as const)));
  const sccLayer = sccs.map(() => 0);
  for (let scc = sccs.length - 1; scc >= 0; scc--) {
    for (const id of sccs[scc]!) {
      for (const to of next.get(id) ?? []) {
        const target = sccOf.get(to)!;
        if (target !== scc) sccLayer[target] = Math.max(sccLayer[target]!, sccLayer[scc]! + 1);
      }
    }
  }
  return new Map([...sccOf].map(([id, scc]) => [id, sccLayer[scc]!]));
}

/** 순환 묶음 안에서 처음 방문한 이슈를 떠나 다시 돌아오는 가장 짧은 경로를 너비 우선으로 찾습니다. */
function cyclePath(scc: string[], next: ReadonlyMap<string, string[]>): string[] {
  const members = new Set(scc);
  const start = scc.at(-1)!;
  const cameFrom = new Map<string, string>();
  const pending = [start];
  for (let at = 0; at < pending.length; at++) {
    const id = pending[at]!;
    for (const to of next.get(id) ?? []) {
      if (to === start) {
        const path = [start];
        for (let back = id; back !== start; back = cameFrom.get(back)!) path.splice(1, 0, back);
        return [...path, start];
      }
      if (!members.has(to) || cameFrom.has(to)) continue;
      cameFrom.set(to, id);
      pending.push(to);
    }
  }
  return [start, start];
}

/** layer 안의 자리 가운데 이슈만 순서대로 돌려줍니다. */
export function layerIssues<E extends LayerEdge>(layer: LayerSlot<E>[]): Issue[] {
  return layer.flatMap((slot) => ("issue" in slot ? [slot.issue] : []));
}

function passingKey(edge: LayerEdge, layer: number): string {
  return `${edge.from}\n${edge.to}\n${layer}`;
}

/**
 * 앞 layer에서 이어지는 위치가 같은 자리끼리의 순서입니다. 이슈는 간선이 지나가는 자리보다 위에, 이슈끼리는 우선순위 순으로 둡니다.
 * 지나가는 간선끼리는 먼저 도착하는 간선을 위에 두어, 도착하려고 이슈 쪽으로 올라갈 때 더 멀리 가는 간선과 엇갈리지 않게 합니다.
 */
function slotOrder<E extends LayerEdge>(
  a: LayerSlot<E>,
  b: LayerSlot<E>,
  layerOf: ReadonlyMap<string, number>,
): number {
  if ("issue" in a && "issue" in b) return byPriorityThenCreated(a.issue, b.issue);
  if ("passing" in a && "passing" in b) {
    return layerOf.get(a.passing.to)! - layerOf.get(b.passing.to)!;
  }
  return "issue" in a ? -1 : 1;
}

function issueCount(component: LayeredComponent<LayerEdge>): number {
  return component.layers.reduce((sum, layer) => sum + layerIssues(layer).length, 0);
}
