import type { ExecutionOrder, OrderEdge } from "@/client/modules/graph/domain/executionOrder";
import {
  COMPONENT_GAP,
  layeredLayout,
  NODE_HEIGHT,
  NODE_WIDTH,
  ROW_GAP,
  type GraphLayout,
  type PlacedEdge,
  type PlacedIssue,
  type Point,
} from "./graphLayout";

/** gate에서 작업으로 가는 선이 작업 아래쪽에 닿는 x 위치입니다. IssueGraph의 condition handle(left-5/6)과 같아야 하고, 관련·발견 선이 닿는 1/3, 2/3 지점과 겹치지 않습니다. */
const CONDITION_ENTRY_X = (NODE_WIDTH * 5) / 6;
const LANE_MARGIN = 12;
const LANE_STEP = 8;
const LANES_PER_GUTTER = 6;

/**
 * gate를 작업 순서 열에서 빼고, gate가 막는 작업의 열 아래에 대기 조건으로 둡니다.
 * gate와 이어진 blocks 간선은 저장된 방향 그대로 남기되, 노드 사이 빈 줄과 열 사이 빈 칸으로만 지나게 꺾습니다.
 */
export function conditionLayout(
  order: ExecutionOrder,
  heights: ReadonlyMap<string, number>,
): GraphLayout {
  const original = layeredLayout(order, NODE_HEIGHT, heights);
  const gates = original.nodes.filter(({ issue }) => issue.issueType === "gate");
  if (gates.length === 0) return original;
  const gateIds = new Set(gates.map(({ issue }) => issue.id));
  const work = layeredLayout(withoutGates(order, gateIds), NODE_HEIGHT, heights);
  const actual = original.edges.map(({ from, to }) => ({ from, to }));
  const placedGates = placeGates(gates, work.nodes, actual, gateIds);
  const nodes = [...work.nodes, ...placedGates];
  const byId = new Map(nodes.map((node) => [node.issue.id, node]));
  const conditionEdges = actual.filter(({ from, to }) => gateIds.has(from) || gateIds.has(to));
  const exitLane = laneIndex(conditionEdges.map(({ from }) => byId.get(from)!));
  const entryLane = laneIndex(
    conditionEdges.filter(({ to }) => gateIds.has(to)).map(({ to }) => byId.get(to)!),
  );
  /** node가 놓인 줄과 그 아래 노드 사이 빈 줄의 가운데입니다. 이 높이로는 어느 노드도 지나지 않습니다. */
  const gapBelow = (node: PlacedIssue) => {
    const bottom = Math.max(
      ...nodes.filter(({ y }) => y === node.y).map(({ y, height }) => y + height),
    );
    const next = Math.min(...nodes.filter(({ y }) => y >= bottom).map(({ y }) => y));
    return Number.isFinite(next) ? (bottom + next) / 2 : bottom + ROW_GAP / 2;
  };
  const route = ({ from, to }: OrderEdge): Point[] => {
    const source = byId.get(from)!;
    const target = byId.get(to)!;
    const exitX = source.x + NODE_WIDTH + laneOffset(exitLane, source);
    if (!gateIds.has(to)) {
      const below = gapBelow(target);
      return [
        { x: exitX, y: source.y + source.height / 2 },
        { x: exitX, y: below },
        { x: target.x + CONDITION_ENTRY_X, y: below },
      ];
    }
    const above = target.y - COMPONENT_GAP / 2;
    const entryX = target.x - laneOffset(entryLane, target);
    return [
      { x: exitX, y: source.y + source.height / 2 },
      { x: exitX, y: above },
      { x: entryX, y: above },
      { x: entryX, y: target.y + target.height / 2 },
    ];
  };
  const edges: PlacedEdge[] = [
    ...work.edges,
    ...conditionEdges.map((edge) => ({ ...edge, passes: [], condition: route(edge) })),
  ];
  return { nodes, edges, nodeHeight: NODE_HEIGHT };
}

/** layer 순서는 gate를 거친 선후 관계까지 반영한 채로 두고, gate만 남은 열과 gate 간선이 지나던 자리를 지웁니다. */
function withoutGates(order: ExecutionOrder, gateIds: ReadonlySet<string>): ExecutionOrder {
  const components = order.components.flatMap(({ layers, edges }) => {
    const workLayers = layers
      .filter((layer) => layer.some((slot) => "issue" in slot && !gateIds.has(slot.issue.id)))
      .map((layer) =>
        layer.filter((slot) =>
          "issue" in slot
            ? !gateIds.has(slot.issue.id)
            : !gateIds.has(slot.passing.from) && !gateIds.has(slot.passing.to),
        ),
      );
    if (workLayers.length === 0) return [];
    return [
      {
        layers: workLayers,
        edges: edges.filter(({ from, to }) => !gateIds.has(from) && !gateIds.has(to)),
      },
    ];
  });
  return { ...order, components };
}

/**
 * gate마다 기다리는 작업 가운데 가장 왼쪽 작업의 열 아래에 둡니다. gate끼리 이어져 있으면 그 끝에서 기다리는 작업을 기준으로 삼고,
 * 기다리는 작업이 없으면 gate의 선행 작업 가운데 가장 오른쪽 열에 둡니다. 같은 열의 gate는 아래로 쌓습니다.
 */
function placeGates(
  gates: PlacedIssue[],
  workNodes: PlacedIssue[],
  edges: OrderEdge[],
  gateIds: ReadonlySet<string>,
): PlacedIssue[] {
  const workById = new Map(workNodes.map((node) => [node.issue.id, node]));
  const columns = gates.map((gate) => {
    const waiting = [...waitingWork(gate.issue.id, edges, gateIds)].flatMap(
      (id) => workById.get(id) ?? [],
    );
    if (waiting.length > 0) return Math.min(...waiting.map(({ x }) => x));
    const prerequisites = edges
      .filter(({ to }) => to === gate.issue.id)
      .flatMap(({ from }) => workById.get(from) ?? []);
    return Math.max(0, ...prerequisites.map(({ x }) => x));
  });
  const rows = new Map<number, number>();
  const rowOf = columns.map((x) => {
    const row = rows.get(x) ?? 0;
    rows.set(x, row + 1);
    return row;
  });
  const rowHeights: number[] = [];
  gates.forEach(({ height }, index) => {
    rowHeights[rowOf[index]!] = Math.max(rowHeights[rowOf[index]!] ?? 0, height);
  });
  const workBottom = Math.max(...workNodes.map(({ y, height }) => y + height));
  let top = workNodes.length > 0 ? workBottom + COMPONENT_GAP : 0;
  const rowTops = rowHeights.map((height) => {
    const y = top;
    top += height + COMPONENT_GAP;
    return y;
  });
  return gates.map((gate, index) => ({ ...gate, x: columns[index]!, y: rowTops[rowOf[index]!]! }));
}

/** gate에서 blocks 방향으로 따라가 처음 만나는 작업들입니다. 중간의 gate는 건너뜁니다. */
function waitingWork(start: string, edges: OrderEdge[], gateIds: ReadonlySet<string>) {
  const reached = new Set<string>();
  const work = new Set<string>();
  const pending = [start];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const { to } of edges.filter(({ from }) => from === current)) {
      if (reached.has(to)) continue;
      reached.add(to);
      if (gateIds.has(to)) pending.push(to);
      else work.add(to);
    }
  }
  return work;
}

/** 열 사이 빈 칸을 지나는 세로선이 서로 겹치지 않게, 같은 열의 노드마다 다른 순번을 줍니다. */
function laneIndex(nodes: PlacedIssue[]): Map<string, number> {
  const lanes = new Map<string, number>();
  const used = new Map<number, number>();
  for (const { issue, x } of nodes) {
    if (lanes.has(issue.id)) continue;
    const index = used.get(x) ?? 0;
    used.set(x, index + 1);
    lanes.set(issue.id, index % LANES_PER_GUTTER);
  }
  return lanes;
}

function laneOffset(lanes: ReadonlyMap<string, number>, node: PlacedIssue) {
  return LANE_MARGIN + LANE_STEP * lanes.get(node.issue.id)!;
}
