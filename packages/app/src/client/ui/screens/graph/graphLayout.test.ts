import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import type { ExecutionOrder } from "@/client/modules/graph/domain/executionOrder";
import { COLUMN_STEP, COMPONENT_GAP, orderLayout, ROW_STEP } from "./graphLayout";

const issue = (id: string) => ({ id }) as Issue;

test("layer는 왼쪽에서 오른쪽으로, layer 안의 이슈는 위에서 아래로 두고, 묶음은 앞 묶음의 가장 긴 layer 아래에 쌓는다", () => {
  const order: ExecutionOrder = {
    components: [
      { layers: [[issue("a")], [issue("b"), issue("c")]], edges: [] },
      { layers: [[issue("d")]], edges: [] },
    ],
    unrelated: 0,
  };

  const positions = Object.fromEntries(
    orderLayout(order).nodes.map((node) => [node.issue.id, [node.x, node.y]]),
  );

  expect(positions).toEqual({
    a: [0, 0],
    b: [COLUMN_STEP, 0],
    c: [COLUMN_STEP, ROW_STEP],
    d: [0, 2 * ROW_STEP + COMPONENT_GAP],
  });
});
