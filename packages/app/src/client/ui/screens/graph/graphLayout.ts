import type { Issue } from "@beads-desk/bd/issue";
import type { ExecutionOrder, OrderEdge } from "@/client/modules/graph/domain/executionOrder";

export const NODE_WIDTH = 232;
export const NODE_HEIGHT = 76;
/** 에픽 계획 보기의 노드는 에픽 밖 표시와 대기 수를 담는 줄을 하나 더 둡니다. */
export const PLAN_NODE_HEIGHT = 96;
/** 이웃한 layer 사이의 거리입니다. 간선 화살표가 보이도록 노드 너비보다 넉넉히 둡니다. */
export const COLUMN_STEP = NODE_WIDTH + 72;
export const ROW_GAP = 16;
/** 이어지지 않은 묶음 사이의 빈 높이입니다. */
export const COMPONENT_GAP = 56;

export type PlacedIssue = { issue: Issue; x: number; y: number };

/** 간선이 사이 layer를 left에서 right까지 y 높이로 가로지르는 구간입니다. 그 자리에는 노드를 두지 않습니다. */
export type PassingSegment = { left: number; right: number; y: number };

/** passes는 간선이 지나가는 사이 layer의 구간을 왼쪽부터 담습니다. 이웃한 layer를 잇는 간선은 비어 있습니다. */
export type PlacedEdge = OrderEdge & { passes: PassingSegment[] };

/** 화면 좌표에 놓은 노드와, 노드 사이에 그릴 간선입니다. 노드는 모두 NODE_WIDTH × nodeHeight 크기입니다. */
export type GraphLayout = { nodes: PlacedIssue[]; edges: PlacedEdge[]; nodeHeight: number };

/** layer로 나눈 묶음을 화면 좌표로 바꿉니다. layer는 왼쪽에서 오른쪽으로, 묶음은 위에서 아래로 쌓습니다. */
export function layeredLayout(graph: ExecutionOrder, nodeHeight = NODE_HEIGHT): GraphLayout {
  const rowStep = nodeHeight + ROW_GAP;
  const nodes: PlacedIssue[] = [];
  const passes = new Map<OrderEdge, PassingSegment[]>();
  let top = 0;
  for (const { layers } of graph.components) {
    layers.forEach((layer, column) =>
      layer.forEach((slot, row) => {
        const x = column * COLUMN_STEP;
        const y = top + row * rowStep;
        if ("issue" in slot) {
          nodes.push({ issue: slot.issue, x, y });
          return;
        }
        // 노드의 handle이 노드 높이 가운데에 있으므로, 지나가는 구간도 같은 높이로 두어 선이 곧게 이어지게 합니다.
        const segment = { left: x, right: x + NODE_WIDTH, y: y + nodeHeight / 2 };
        passes.set(slot.passing, [...(passes.get(slot.passing) ?? []), segment]);
      }),
    );
    top += Math.max(...layers.map((layer) => layer.length)) * rowStep + COMPONENT_GAP;
  }
  return {
    nodes,
    edges: graph.components.flatMap(({ edges }) =>
      edges.map((edge) => ({ ...edge, passes: passes.get(edge) ?? [] })),
    ),
    nodeHeight,
  };
}
