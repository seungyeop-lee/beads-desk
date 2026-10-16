import type { AuxiliaryEdge } from "@/client/modules/graph/domain/centerGraph";
import type { Issue } from "@beads-desk/bd/issue";
import type { ExecutionOrder, OrderEdge } from "@/client/modules/graph/domain/executionOrder";

export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 76;
/** 에픽 계획 보기의 노드는 에픽 밖 표시와 대기 수를 담는 줄을 하나 더 둡니다. */
export const PLAN_NODE_HEIGHT = 96;
/** 이웃한 layer 사이의 거리입니다. 간선 화살표가 보이도록 노드 너비보다 넉넉히 둡니다. */
export const COLUMN_STEP = NODE_WIDTH + 72;
export const ROW_GAP = 16;
/** 이어지지 않은 묶음 사이의 빈 높이입니다. */
export const COMPONENT_GAP = 56;
const BYPASS_MARGIN = 12;

export type PlacedIssue = { issue: Issue; x: number; y: number; height: number };

/** 간선이 사이 layer를 left에서 right까지 y 높이로 가로지르는 구간입니다. 그 자리에는 노드를 두지 않습니다. */
export type PassingSegment = { left: number; right: number; y: number };

export type Point = { x: number; y: number };

/**
 * passes는 사이 layer를 지나는 구간이고, bypassX는 같은 열 간선이 노드 오른쪽으로 돌아가는 세로 구간의 x 좌표입니다.
 * condition은 gate와 이어진 간선이 출발점과 도착점 사이에서 꺾이는 점입니다.
 */
export type PlacedEdge = OrderEdge & {
  passes: PassingSegment[];
  bypassX?: number;
  condition?: Point[];
};

/** 화면 좌표와 실제 높이가 정해진 노드 및 노드를 피해 지나는 간선입니다. */
export type GraphLayout = { nodes: PlacedIssue[]; edges: PlacedEdge[]; nodeHeight: number };

/** layer로 나눈 묶음을 화면 좌표로 바꿉니다. layer는 왼쪽에서 오른쪽으로, 묶음은 위에서 아래로 쌓습니다. */
export function layeredLayout(
  graph: ExecutionOrder,
  nodeHeight = NODE_HEIGHT,
  heights: ReadonlyMap<string, number> = new Map(),
): GraphLayout {
  const nodes: PlacedIssue[] = [];
  const passes = new Map<OrderEdge, PassingSegment[]>();
  let top = 0;
  for (const { layers } of graph.components) {
    const rowHeights = Array.from(
      { length: Math.max(...layers.map((layer) => layer.length)) },
      (_, row) =>
        Math.max(
          nodeHeight,
          ...layers.map((layer) => {
            const slot = layer[row];
            return slot && "issue" in slot
              ? (heights.get(slot.issue.id) ?? nodeHeight)
              : nodeHeight;
          }),
        ),
    );
    let rowTop = top;
    const rowTops = rowHeights.map((height) => {
      const y = rowTop;
      rowTop += height + ROW_GAP;
      return y;
    });
    layers.forEach((layer, column) =>
      layer.forEach((slot, row) => {
        const x = column * COLUMN_STEP;
        const y = rowTops[row]!;
        if ("issue" in slot) {
          nodes.push({ issue: slot.issue, x, y, height: heights.get(slot.issue.id) ?? nodeHeight });
          return;
        }
        // 높이가 다른 노드 사이에서도 통과 간선이 노드 밑을 지나지 않도록 빈 행의 가운데를 사용합니다.
        const segment = { left: x, right: x + NODE_WIDTH, y: y + rowHeights[row]! / 2 };
        passes.set(slot.passing, [...(passes.get(slot.passing) ?? []), segment]);
      }),
    );
    top = rowTop + COMPONENT_GAP;
  }
  const edges = graph.components.flatMap(({ edges }) => edges);
  const byId = new Map(nodes.map((node) => [node.issue.id, node]));
  const sameColumn = new Map<number, OrderEdge[]>();
  for (const edge of edges) {
    const from = byId.get(edge.from)!;
    if (from.x === byId.get(edge.to)!.x) {
      sameColumn.set(from.x, [...(sameColumn.get(from.x) ?? []), edge]);
    }
  }
  const bypasses = new Map<OrderEdge, number>();
  for (const [x, columnEdges] of sameColumn) {
    columnEdges.forEach((edge, index) => {
      const gutter = COLUMN_STEP - NODE_WIDTH;
      const offset =
        BYPASS_MARGIN + ((gutter - 2 * BYPASS_MARGIN) * (index + 1)) / (columnEdges.length + 1);
      bypasses.set(edge, x + NODE_WIDTH + offset);
    });
  }
  return {
    nodes,
    edges: edges.map((edge) => ({
      ...edge,
      passes: passes.get(edge) ?? [],
      ...(bypasses.has(edge) && { bypassX: bypasses.get(edge)! }),
    })),
    nodeHeight,
  };
}

/** blocks 사슬의 좌표를 유지하고, 보조 관계로만 연결된 이슈를 그 아래에 둡니다. */
export function centerLayout(
  layout: GraphLayout,
  extra: Issue[],
  auxiliary: AuxiliaryEdge[],
  center: Issue | undefined,
  heights: ReadonlyMap<string, number>,
): GraphLayout {
  if (auxiliary.length === 0) return layout;
  const nodes = [...layout.nodes];
  if (nodes.length === 0 && center) {
    nodes.push({ issue: center, x: 0, y: 0, height: heights.get(center.id) ?? NODE_HEIGHT });
  }
  let top = Math.max(0, ...nodes.map(({ y, height }) => y + height)) + COMPONENT_GAP;
  for (let start = 0; start < extra.length; start += 3) {
    const row = extra.slice(start, start + 3);
    row.forEach((issue, column) =>
      nodes.push({
        issue,
        x: column * COLUMN_STEP,
        y: top,
        height: heights.get(issue.id) ?? NODE_HEIGHT,
      }),
    );
    top += Math.max(...row.map(({ id }) => heights.get(id) ?? NODE_HEIGHT)) + ROW_GAP;
  }
  return { ...layout, nodes };
}
