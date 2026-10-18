import type { Issue } from "@beads-desk/bd/issue";
import type { AuxiliaryEdge } from "./centerGraph";
import {
  type ExecutionOrder,
  type OrderComponent,
  type OrderEdge,
  workLayers,
} from "./executionOrder";
import type { GraphLayout } from "./graphLayout";
import { routeGrid } from "./gridRoutes";

export type GraphLayoutInput = {
  order: ExecutionOrder;
  /** 실제로 잰 카드 높이입니다. 아직 재지 않은 이슈는 nodeHeight로 놓습니다. */
  heights: ReadonlyMap<string, number>;
  nodeHeight: number;
  /**
   * 이슈 중심 보기에서 함께 그리는 관련·발견 관계입니다. center는 기준 이슈이고, issues는 blocks 사슬 밖에서 관계로만 이어진 이슈,
   * edges는 기준 이슈에 직접 연결된 관련·발견 간선입니다.
   */
  auxiliary?: { center: Issue | undefined; issues: Issue[]; edges: AuxiliaryEdge[] };
};

type Cell = { issue: Issue; column: number; row: number };
type Spot = Pick<Cell, "column" | "row">;

/** 열 안 순서를 이웃의 평균 위치로 다시 정렬하는 횟수입니다. 오른쪽으로 한 번, 왼쪽으로 한 번씩 번갈아 셉니다. */
const ORDER_SWEEPS = 8;
/** 관련 이슈를 둘 빈 칸을 고를 때 열 하나를 건너는 거리를 행 몇 개로 볼지입니다. 열 간격이 행 간격보다 훨씬 넓습니다. */
const COLUMN_DISTANCE = 3;

/**
 * 그래프 모달과 에픽 계획 화면이 함께 쓰는 배치 진입점입니다. 이슈를 격자에 놓은 뒤, 모든 간선을 같은 라우터로 이어 좌표를 정합니다.
 * 열은 blocks 기준 가장 긴 경로이고(순환은 한 열), gate는 막는 작업 바로 아래 같은 열에 둡니다. 묶음은 위에서 아래로 쌓습니다.
 * 같은 입력이면 같은 결과를 돌려줍니다.
 */
export function layoutGraph({
  order,
  heights,
  nodeHeight,
  auxiliary,
}: GraphLayoutInput): GraphLayout {
  const cells: Cell[] = [];
  const componentStarts = new Set<number>();
  let top = 0;
  for (const component of order.components) {
    if (top > 0) componentStarts.add(top);
    const columns = componentColumns(component);
    columns.forEach((column, at) =>
      column.forEach((issue, row) => cells.push({ issue, column: at, row: top + row })),
    );
    top += Math.max(...columns.map((column) => column.length));
  }
  const blocks = order.components.flatMap(({ edges }) => edges);
  const auxiliaryEdges = auxiliary ? placeAuxiliary(cells, auxiliary, blocks) : [];

  const left = Math.min(0, ...cells.map(({ column }) => column));
  const up = Math.min(0, ...cells.map(({ row }) => row));
  const cellOf = new Map(cells.map((cell) => [cell.issue.id, cell]));
  const routes = routeGrid({
    nodes: cells.map(({ issue, column, row }) => ({
      id: issue.id,
      column: column - left,
      row: row - up,
      height: heights.get(issue.id) ?? nodeHeight,
    })),
    componentStarts: new Set([...componentStarts].map((row) => row - up)),
    // 관련 관계는 방향이 없으므로 왼쪽 이슈에서 출발하게 해, 왼쪽으로 돌아가는 경로를 만들지 않습니다.
    edges: [
      ...blocks,
      ...auxiliaryEdges.map(({ from, to, type }) =>
        type === "related" && cellOf.get(to)!.column < cellOf.get(from)!.column
          ? { from: to, to: from }
          : { from, to },
      ),
    ],
  });
  const nodes = cells.map(({ issue, column, row }) => ({
    issue,
    x: routes.columns[column - left]!,
    y: routes.rows[row - up]!,
    height: heights.get(issue.id) ?? nodeHeight,
  }));
  return {
    nodes,
    nodeOf: new Map(nodes.map((node) => [node.issue.id, node])),
    edges: blocks.map((edge, index) => ({ ...edge, points: routes.points[index]! })),
    auxiliary: auxiliaryEdges.map((edge, index) => ({
      ...edge,
      points: routes.points[blocks.length + index]!,
    })),
    columns: routes.columns,
  };
}

/** 묶음의 열마다 위에서 아래 순서의 이슈입니다. gate는 막는 작업 바로 아래에 이어 둡니다. */
function componentColumns(component: OrderComponent): Issue[][] {
  const work = workLayers(component);
  // 작업 없이 gate만 이어진 묶음은 gate를 붙일 작업이 없으므로 실행 순서의 열에 그대로 둡니다.
  if (work.length === 0) return component.layers;
  const stacks = gateStacks(component, work);
  const anchorOf = new Map(
    [...stacks].flatMap(([anchor, gates]) => gates.map((gate) => [gate.id, anchor] as const)),
  );
  return orderColumns(work, component.edges, anchorOf, stacks).map((column) =>
    column.flatMap((issue) => [issue, ...(stacks.get(issue.id) ?? [])]),
  );
}

/**
 * gate마다 붙일 작업을 정하고, 작업마다 그 아래에 둘 gate를 위에서 아래 순서로 돌려줍니다.
 * gate가 막는 작업 가운데 가장 왼쪽 작업에 붙이고, gate끼리 이어져 있으면 그 끝에서 기다리는 작업을 봅니다.
 * 막는 작업이 없으면 gate를 막는 작업 가운데 가장 오른쪽 작업에, 그것도 없으면 gate를 거쳐 이어진 가장 가까운 작업에 붙입니다.
 * 작업에 가까운 gate부터 위에 두어, gate끼리 이어지는 선이 바로 위아래로 이어지게 합니다.
 * 다만 붙인 작업과 그 아래 gate가 아닌 이슈를 막는 gate는 맨 아래로 내리고, 같은 작업 아래에서 그 gate를 막는 gate도 함께 내립니다.
 * 같은 열에서 위로 되돌아가는 선과 다른 열로 나가는 선이 모두 열 오른쪽 틈을 지나므로, 나가는 선이 위에 있으면
 * 그 아래 gate에서 되돌아가는 선과 교차합니다.
 */
function gateStacks(component: OrderComponent, work: Issue[][]): Map<string, Issue[]> {
  const columnOf = new Map(work.flatMap((layer, at) => layer.map(({ id }) => [id, at] as const)));
  const layerOf = new Map(
    component.layers.flatMap((layer, at) => layer.map(({ id }) => [id, at] as const)),
  );
  const isGate = (id: string) => !columnOf.has(id);
  const forward = links(component.edges, "from");
  const backward = links(component.edges, "to");
  const both = new Map(
    [...layerOf.keys()].map((id) => [
      id,
      [...(forward.get(id) ?? []), ...(backward.get(id) ?? [])],
    ]),
  );
  /** gate에서 출발해 gate만 거쳐 처음 닿는 작업을 너비 우선 순서로 돌려줍니다. */
  const reachedWork = (start: string, next: ReadonlyMap<string, string[]>) => {
    const seen = new Set([start]);
    const found: string[] = [];
    for (let queue = [start]; queue.length > 0;) {
      const following: string[] = [];
      for (const id of queue)
        for (const to of next.get(id) ?? []) {
          if (seen.has(to)) continue;
          seen.add(to);
          if (isGate(to)) following.push(to);
          else found.push(to);
        }
      queue = following;
    }
    return found;
  };
  const pick = (ids: string[], better: (a: number, b: number) => boolean) =>
    ids.reduce((best, id) => (better(columnOf.get(id)!, columnOf.get(best)!) ? id : best));

  const stacks = new Map<string, { gate: Issue; waits: boolean }[]>();
  const anchorOf = new Map<string, string>();
  const gates = component.layers.flat().filter(({ id }) => isGate(id));
  for (const gate of gates) {
    const waiting = reachedWork(gate.id, forward);
    const blockers = reachedWork(gate.id, backward);
    const anchor =
      waiting.length > 0
        ? pick(waiting, (a, b) => a < b)
        : blockers.length > 0
          ? pick(blockers, (a, b) => a > b)
          : reachedWork(gate.id, both)[0]!;
    stacks.set(anchor, [...(stacks.get(anchor) ?? []), { gate, waits: waiting.length > 0 }]);
    anchorOf.set(gate.id, anchor);
  }
  /** gate가 직접, 또는 같은 작업 아래의 gate를 거쳐 그 작업과 아래 gate가 아닌 이슈를 막는지입니다. */
  const leavesStack = (start: string) => {
    const anchor = anchorOf.get(start);
    const seen = new Set([start]);
    for (const queue = [start]; queue.length > 0;)
      for (const to of forward.get(queue.pop()!) ?? []) {
        if ((anchorOf.get(to) ?? to) !== anchor) return true;
        if (anchorOf.has(to) && !seen.has(to)) {
          seen.add(to);
          queue.push(to);
        }
      }
    return false;
  };
  return new Map(
    [...stacks].map(([anchor, stack]) => [
      anchor,
      stack
        .map((entry) => ({ ...entry, leaves: leavesStack(entry.gate.id) }))
        .toSorted(
          (a, b) =>
            Number(a.leaves) - Number(b.leaves) ||
            Number(b.waits) - Number(a.waits) ||
            (a.waits
              ? layerOf.get(b.gate.id)! - layerOf.get(a.gate.id)!
              : layerOf.get(a.gate.id)! - layerOf.get(b.gate.id)!),
        )
        .map(({ gate }) => gate),
    ]),
  );
}

function links(edges: OrderEdge[], side: "from" | "to"): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const edge of edges) {
    const [start, end] = side === "from" ? [edge.from, edge.to] : [edge.to, edge.from];
    result.set(start, [...(result.get(start) ?? []), end]);
  }
  return result;
}

/**
 * 열 안 순서를 이웃 노드의 평균 행 위치로 정렬합니다. 왼쪽 이웃을 보며 오른쪽으로, 오른쪽 이웃을 보며 왼쪽으로 번갈아 여러 번 정렬하고,
 * 이웃한 열 사이의 교차가 가장 적었던 순서를 씁니다. gate는 붙인 작업의 자리로 보고, 행 위치에는 작업 아래에 붙인 gate 수를 셉니다.
 */
function orderColumns(
  work: Issue[][],
  edges: OrderEdge[],
  anchorOf: ReadonlyMap<string, string>,
  stacks: ReadonlyMap<string, Issue[]>,
): Issue[][] {
  const columnOf = new Map(work.flatMap((layer, at) => layer.map(({ id }) => [id, at] as const)));
  const neighbors = new Map<string, string[]>();
  const pairs: [string, string][] = [];
  for (const edge of edges) {
    const [from, to] = [edge.from, edge.to].map((id) => anchorOf.get(id) ?? id) as [string, string];
    if (columnOf.get(from) === columnOf.get(to)) continue;
    neighbors.set(from, [...(neighbors.get(from) ?? []), to]);
    neighbors.set(to, [...(neighbors.get(to) ?? []), from]);
    pairs.push([from, to]);
  }
  const rowsOf = (columns: Issue[][]) =>
    new Map(
      columns.flatMap((column) => {
        let row = 0;
        return column.map(({ id }) => {
          const at = row;
          row += 1 + (stacks.get(id)?.length ?? 0);
          return [id, at] as const;
        });
      }),
    );
  // 정렬해도 노드의 열은 바뀌지 않으므로, 바로 이웃한 두 열 사이의 간선을 왼쪽 열마다 한 번만 모아 둡니다.
  // 교차는 같은 열 쌍의 간선끼리만 생기므로 열 쌍마다 따로 세면, 큰 에픽에서도 간선 수 전체의 제곱만큼 비교하지 않습니다.
  const adjacentByColumn = Map.groupBy(
    pairs
      .map((pair) => pair.toSorted((a, b) => columnOf.get(a)! - columnOf.get(b)!))
      .filter(([a, b]) => columnOf.get(b)! - columnOf.get(a)! === 1),
    ([a]) => columnOf.get(a)!,
  );
  const crossings = (columns: Issue[][]) => {
    const rows = rowsOf(columns);
    let count = 0;
    for (const adjacent of adjacentByColumn.values())
      for (let i = 0; i < adjacent.length; i++)
        for (let j = i + 1; j < adjacent.length; j++) {
          const [a, b] = adjacent[i]!;
          const [c, d] = adjacent[j]!;
          if ((rows.get(a)! - rows.get(c)!) * (rows.get(b)! - rows.get(d)!) < 0) count++;
        }
    return count;
  };

  let columns = work.map((layer) => [...layer]);
  let best = columns;
  let fewest = crossings(columns);
  for (let sweep = 0; sweep < ORDER_SWEEPS; sweep++) {
    const rightward = sweep % 2 === 0;
    const sequence = columns.map((_, at) => at);
    for (const at of rightward ? sequence.slice(1) : sequence.slice(0, -1).toReversed()) {
      const rows = rowsOf(columns);
      const position = ({ id }: Issue) => {
        const near = (neighbors.get(id) ?? []).filter((other) =>
          rightward ? columnOf.get(other)! < at : columnOf.get(other)! > at,
        );
        return near.length > 0
          ? near.reduce((sum, other) => sum + rows.get(other)!, 0) / near.length
          : rows.get(id)!;
      };
      columns = columns.with(
        at,
        columns[at]!.toSorted((a, b) => position(a) - position(b)),
      );
    }
    const count = crossings(columns);
    if (count < fewest) {
      best = columns;
      fewest = count;
    }
  }
  return best;
}

/**
 * 체인 밖 관련·발견 이슈를 연결된 노드에 가장 가까운 빈 칸에 둡니다. 발견 이슈는 발견한 작업보다 한 열 오른쪽에 두어,
 * 발견 간선이 blocks처럼 왼쪽에서 오른쪽으로 읽히게 합니다. 가장 가까운 빈 칸이 여럿이면 이미 놓인 간선과 덜 교차하는 칸을 고르고,
 * 교차 수까지 같으면 후보 순서를 따릅니다. 그릴 수 있는 관련·발견 간선을 돌려줍니다.
 */
function placeAuxiliary(
  cells: Cell[],
  { center, issues, edges }: NonNullable<GraphLayoutInput["auxiliary"]>,
  blocks: OrderEdge[],
): AuxiliaryEdge[] {
  if (edges.length === 0) return [];
  if (cells.length === 0 && center) cells.push({ issue: center, column: 0, row: 0 });
  const cellOf = new Map(cells.map((cell) => [cell.issue.id, cell]));
  const taken = new Set(cells.map(({ column, row }) => `${column}:${row}`));
  const placed: OrderEdge[] = [...blocks];
  for (const issue of issues) {
    const links = edges.filter(
      ({ from, to }) =>
        (from === issue.id && cellOf.has(to)) || (to === issue.id && cellOf.has(from)),
    );
    const edge = links[0];
    const anchor = edge
      ? cellOf.get(edge.from === issue.id ? edge.to : edge.from)!
      : center && cellOf.get(center.id);
    if (!anchor) continue;
    const free = (
      edge?.type === "discovered-from"
        ? columnCandidates(anchor, edge.to === issue.id ? 1 : -1, cells.length)
        : nearbyCandidates(anchor, cells.length)
    ).filter((candidate) => !taken.has(`${candidate.column}:${candidate.row}`));
    const crossingsAt = (candidate: Spot) =>
      links.reduce((sum, { from, to }) => {
        const other = cellOf.get(from === issue.id ? to : from)!;
        return sum + placed.filter((line) => crosses(candidate, other, line, cellOf)).length;
      }, 0);
    const { column, row } = free
      .filter(({ distance }) => distance === free[0]!.distance)
      .map((candidate) => ({ ...candidate, crossings: crossingsAt(candidate) }))
      .reduce((best, candidate) => (candidate.crossings < best.crossings ? candidate : best));
    const cell = { issue, column, row };
    cells.push(cell);
    cellOf.set(issue.id, cell);
    taken.add(`${column}:${row}`);
    placed.push(...links);
  }
  return edges.filter(({ from, to }) => cellOf.has(from) && cellOf.has(to));
}

/**
 * 칸 a와 b를 잇는 간선이 이미 놓인 간선 line과 교차하는지를, 두 간선을 칸 사이의 곧은 선으로 보고 판단합니다.
 * 실제 경로는 틈을 따라 꺾이지만, 배치를 고르는 단계에서는 경로가 아직 없으므로 곧은 선으로 어림합니다.
 * 끝을 함께 쓰거나 한 직선 위에 겹치는 선은 교차로 보지 않습니다.
 */
function crosses(a: Spot, b: Spot, line: OrderEdge, cellOf: ReadonlyMap<string, Cell>) {
  const [c, d] = [cellOf.get(line.from), cellOf.get(line.to)];
  if (!c || !d) return false;
  const side = (p: Spot, q: Spot, r: Spot) =>
    Math.sign((q.column - p.column) * (r.row - p.row) - (q.row - p.row) * (r.column - p.column));
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
}

/**
 * anchor의 왼쪽(-1)이나 오른쪽(1) 열에서 anchor와 같은 행부터 가까운 행 순서이고, 거리가 같으면 아래 행이 먼저입니다.
 * distance는 anchor와 떨어진 행 수입니다.
 */
function columnCandidates({ column, row }: Cell, side: 1 | -1, reach: number) {
  return Array.from({ length: 2 * reach + 1 }, (_, at) => ({
    column: column + side,
    row: row + (at % 2 === 1 ? (at + 1) / 2 : -at / 2),
    distance: Math.ceil(at / 2),
  }));
}

/**
 * anchor 둘레의 칸을 가까운 순서로 돌려줍니다. 거리가 같으면 같은 열, 아래, 오른쪽이 먼저입니다.
 * distance는 열 하나를 행 COLUMN_DISTANCE개로 보고 잰 거리입니다.
 */
function nearbyCandidates({ column, row }: Cell, reach: number) {
  const span = reach + 1;
  return Array.from({ length: 2 * COLUMN_DISTANCE + 1 }, (_, dc) => dc - COLUMN_DISTANCE)
    .flatMap((dc) =>
      Array.from({ length: 2 * span + 1 }, (_, dr) => dr - span).map((dr) => ({
        dc,
        dr,
        distance: COLUMN_DISTANCE * Math.abs(dc) + Math.abs(dr),
      })),
    )
    .filter(({ dc, dr }) => dc !== 0 || dr !== 0)
    .toSorted(
      (a, b) =>
        a.distance - b.distance ||
        Math.abs(a.dc) - Math.abs(b.dc) ||
        Number(a.dr < 0) - Number(b.dr < 0) ||
        Number(a.dc < 0) - Number(b.dc < 0),
    )
    .map(({ dc, dr, distance }) => ({ column: column + dc, row: row + dr, distance }));
}
