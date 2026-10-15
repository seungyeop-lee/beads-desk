import type { Issue } from "@beads-desk/bd/issue";
import type { ExecutionOrder } from "@/client/modules/graph/domain/executionOrder";
import type { IssueHierarchy } from "@/client/modules/graph/domain/issueHierarchy";

export const NODE_WIDTH = 232;
export const NODE_HEIGHT = 76;
/** 이웃한 layer 사이의 거리입니다. 간선 화살표가 보이도록 노드 너비보다 넉넉히 둡니다. */
export const COLUMN_STEP = NODE_WIDTH + 72;
export const ROW_STEP = NODE_HEIGHT + 16;
/** 이어지지 않은 묶음 사이의 빈 높이입니다. */
export const COMPONENT_GAP = 56;

export type PlacedIssue = { issue: Issue; x: number; y: number };

/** 탭마다 화면 좌표에 놓은 노드와, 노드 사이에 그릴 간선입니다. */
export type GraphLayout = { nodes: PlacedIssue[]; edges: { from: string; to: string }[] };

/** 실행 순서를 화면 좌표로 바꿉니다. layer는 왼쪽에서 오른쪽으로, 묶음은 위에서 아래로 쌓습니다. */
export function orderLayout(order: ExecutionOrder): GraphLayout {
  const nodes: PlacedIssue[] = [];
  let top = 0;
  for (const { layers } of order.components) {
    layers.forEach((layer, column) =>
      layer.forEach((issue, row) =>
        nodes.push({ issue, x: column * COLUMN_STEP, y: top + row * ROW_STEP }),
      ),
    );
    top += Math.max(...layers.map((layer) => layer.length)) * ROW_STEP + COMPONENT_GAP;
  }
  return { nodes, edges: order.components.flatMap((component) => component.edges) };
}

/**
 * 계층을 화면 좌표로 바꿉니다. 깊이마다 한 열씩 오른쪽에 둡니다.
 * 첫 하위 이슈는 상위 이슈와 같은 줄에 두므로, 줄 수는 하위 이슈가 없는 이슈의 수와 같습니다.
 */
export function hierarchyLayout({ rows, edges }: IssueHierarchy): GraphLayout {
  const nodes: PlacedIssue[] = [];
  let line = -1;
  let gaps = 0;
  let previousDepth = Infinity;
  for (const { issue, depth } of rows) {
    if (depth === 0 && line >= 0) gaps += 1;
    if (depth <= previousDepth) line += 1;
    nodes.push({ issue, x: depth * COLUMN_STEP, y: line * ROW_STEP + gaps * COMPONENT_GAP });
    previousDepth = depth;
  }
  return { nodes, edges };
}
