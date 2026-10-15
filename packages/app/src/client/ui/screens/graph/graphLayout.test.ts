import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import type { ExecutionOrder } from "@/client/modules/graph/domain/executionOrder";
import type { IssueHierarchy } from "@/client/modules/graph/domain/issueHierarchy";
import { COLUMN_STEP, COMPONENT_GAP, hierarchyLayout, orderLayout, ROW_STEP } from "./graphLayout";

const issue = (id: string) => ({ id }) as Issue;

test("계층은 깊이마다 오른쪽 열에 두고, 첫 하위 이슈는 상위 이슈와 같은 줄에, 나머지 하위 이슈는 그 아래 줄에 두며, 최상위 이슈마다 묶음 간격을 띄운다", () => {
  const hierarchy: IssueHierarchy = {
    rows: [
      { issue: issue("epic"), depth: 0, childCount: 2 },
      { issue: issue("feature"), depth: 1, childCount: 1 },
      { issue: issue("task"), depth: 2, childCount: 0 },
      { issue: issue("feature-2"), depth: 1, childCount: 0 },
      { issue: issue("epic-2"), depth: 0, childCount: 1 },
      { issue: issue("feature-3"), depth: 1, childCount: 0 },
    ],
    edges: [{ from: "epic", to: "feature" }],
    unrelated: 0,
  };

  const layout = hierarchyLayout(hierarchy);

  expect(Object.fromEntries(layout.nodes.map((node) => [node.issue.id, [node.x, node.y]]))).toEqual(
    {
      epic: [0, 0],
      feature: [COLUMN_STEP, 0],
      task: [2 * COLUMN_STEP, 0],
      "feature-2": [COLUMN_STEP, ROW_STEP],
      "epic-2": [0, 2 * ROW_STEP + COMPONENT_GAP],
      "feature-3": [COLUMN_STEP, 2 * ROW_STEP + COMPONENT_GAP],
    },
  );
  expect(layout.edges).toEqual(hierarchy.edges);
});

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
