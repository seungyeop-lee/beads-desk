import type { Issue } from "@beads-desk/bd/issue";
import type { ExecutionOrder, OrderEdge } from "@/client/modules/graph/domain/executionOrder";

export const NODE_WIDTH = 232;
export const NODE_HEIGHT = 76;
/** 이웃한 layer 사이의 거리입니다. 간선 화살표가 보이도록 노드 너비보다 넉넉히 둡니다. */
export const COLUMN_STEP = NODE_WIDTH + 72;
export const ROW_STEP = NODE_HEIGHT + 16;
/** 이어지지 않은 묶음 사이의 빈 높이입니다. */
export const COMPONENT_GAP = 56;

export type PlacedIssue = { issue: Issue; x: number; y: number };

/** 화면 좌표에 놓은 노드와, 노드 사이에 그릴 간선입니다. */
export type GraphLayout = { nodes: PlacedIssue[]; edges: OrderEdge[] };

/** layer로 나눈 묶음을 화면 좌표로 바꿉니다. layer는 왼쪽에서 오른쪽으로, 묶음은 위에서 아래로 쌓습니다. */
export function layeredLayout(graph: ExecutionOrder): GraphLayout {
  const nodes: PlacedIssue[] = [];
  let top = 0;
  for (const { layers } of graph.components) {
    layers.forEach((layer, column) =>
      layer.forEach((issue, row) =>
        nodes.push({ issue, x: column * COLUMN_STEP, y: top + row * ROW_STEP }),
      ),
    );
    top += Math.max(...layers.map((layer) => layer.length)) * ROW_STEP + COMPONENT_GAP;
  }
  return { nodes, edges: graph.components.flatMap((component) => component.edges) };
}
