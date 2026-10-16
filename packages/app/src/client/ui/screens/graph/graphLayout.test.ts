import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import type { ExecutionOrder } from "@/client/modules/graph/domain/executionOrder";
import { COLUMN_STEP, COMPONENT_GAP, layeredLayout, ROW_GAP } from "./graphLayout";

const issue = (id: string) => ({ id }) as Issue;

test("layer는 왼쪽에서 오른쪽으로, layer 안의 이슈는 노드 높이에 간격을 더해 위에서 아래로 두고, 묶음은 앞 묶음의 가장 긴 layer 아래에 쌓는다", () => {
  const order: ExecutionOrder = {
    components: [
      { layers: [[issue("a")], [issue("b"), issue("c")]], edges: [] },
      { layers: [[issue("d")]], edges: [] },
    ],
    unlinked: [],
    cycles: [],
  };

  const nodeHeight = 80;
  const rowStep = nodeHeight + ROW_GAP;
  const positions = Object.fromEntries(
    layeredLayout(order, nodeHeight).nodes.map((node) => [node.issue.id, [node.x, node.y]]),
  );

  expect(positions).toEqual({
    a: [0, 0],
    b: [COLUMN_STEP, 0],
    c: [COLUMN_STEP, rowStep],
    d: [0, 2 * rowStep + COMPONENT_GAP],
  });
});
