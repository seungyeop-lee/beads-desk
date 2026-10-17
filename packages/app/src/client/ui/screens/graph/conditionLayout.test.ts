import type { Issue, IssueDependency } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { executionOrder } from "@/client/modules/graph/domain/executionOrder";
import { conditionLayout } from "./conditionLayout";
import { COLUMN_STEP, type GraphLayout, layeredLayout, NODE_WIDTH } from "./graphLayout";

const issue = (id: string, issueType = "task") =>
  ({ id, issueType, status: "open", title: id, priority: 2, createdAt: 0 }) as Issue;
const blocks = (issueId: string, dependsOnId: string): IssueDependency => ({
  issueId,
  dependsOnId,
  type: "blocks",
  createdAt: 0,
});

const placed = (layout: GraphLayout, id: string) =>
  layout.nodes.find(({ issue }) => issue.id === id)!;

/** 출발 handle에서 도착 handle까지 그려지는 꺾은선입니다. 작업은 아래쪽, gate는 왼쪽으로 들어갑니다. */
function conditionPath(layout: GraphLayout, from: string, to: string) {
  const edge = layout.edges.find((edge) => edge.from === from && edge.to === to)!;
  const source = placed(layout, from);
  const target = placed(layout, to);
  const last = edge.condition!.at(-1)!;
  const end =
    target.issue.issueType === "gate"
      ? { x: target.x, y: target.y + target.height / 2 }
      : { x: last.x, y: target.y + target.height };
  return [{ x: source.x + NODE_WIDTH, y: source.y + source.height / 2 }, ...edge.condition!, end];
}

function expectNoNodeCrossed(layout: GraphLayout) {
  for (const edge of layout.edges.filter(({ condition }) => condition)) {
    const points = conditionPath(layout, edge.from, edge.to);
    for (let i = 1; i < points.length; i++) {
      const start = points[i - 1]!;
      const end = points[i]!;
      expect(start.x === end.x || start.y === end.y, `${edge.from}->${edge.to} 꺾은선`).toBe(true);
      for (const node of layout.nodes) {
        const crossesX =
          Math.max(start.x, end.x) > node.x && Math.min(start.x, end.x) < node.x + NODE_WIDTH;
        const crossesY =
          Math.max(start.y, end.y) > node.y && Math.min(start.y, end.y) < node.y + node.height;
        expect(crossesX && crossesY, `${edge.from}->${edge.to}가 ${node.issue.id}를 지남`).toBe(
          false,
        );
      }
    }
  }
}

test("작업은 가로 순서를 유지하고, gate는 별도 열 없이 기다리는 작업 아래에서 그 작업의 아래쪽으로 연결된다", () => {
  const layout = conditionLayout(
    executionOrder(
      [issue("a"), issue("b"), issue("c"), issue("gate", "gate")],
      [blocks("b", "a"), blocks("c", "b"), blocks("b", "gate")],
    ),
    new Map(),
  );
  const [a, b, c, gate] = ["a", "b", "c", "gate"].map((id) => placed(layout, id));
  expect([a!.x, b!.x, c!.x]).toEqual([0, COLUMN_STEP, 2 * COLUMN_STEP]);
  expect(new Set([a!.y, b!.y, c!.y]).size).toBe(1);
  expect(gate!.x).toBe(b!.x);
  expect(gate!.y).toBeGreaterThan(b!.y + b!.height);
  expect(
    layout.edges.find(({ from, to }) => from === "a" && to === "b")!.condition,
  ).toBeUndefined();
  const path = conditionPath(layout, "gate", "b");
  expect(path.at(-1)!.y).toBe(b!.y + b!.height);
  expect(path.at(-2)!.y).toBeGreaterThan(path.at(-1)!.y);
  expectNoNodeCrossed(layout);
});

test("복수 gate, 공유 gate, gate의 선행 조건이 있어도 모든 노드와 저장된 blocks 방향을 유지하고 선이 노드를 지나지 않는다", () => {
  const issues = [
    issue("a"),
    issue("b"),
    issue("c"),
    issue("g1", "gate"),
    issue("g2", "gate"),
    issue("g3", "gate"),
  ];
  const dependencies = [
    blocks("b", "a"),
    blocks("c", "b"),
    blocks("b", "g1"),
    blocks("b", "g2"),
    blocks("c", "g1"),
    blocks("g1", "a"),
    blocks("g2", "g3"),
  ];
  const layout = conditionLayout(
    executionOrder(issues, dependencies),
    new Map([
      ["a", 130],
      ["g1", 120],
    ]),
  );
  expect(new Set(layout.nodes.map(({ issue }) => issue.id))).toEqual(
    new Set(issues.map(({ id }) => id)),
  );
  expect(layout.edges.map(({ from, to }) => `${from}->${to}`).sort()).toEqual(
    dependencies.map(({ issueId, dependsOnId }) => `${dependsOnId}->${issueId}`).sort(),
  );
  const b = placed(layout, "b");
  for (const id of ["g1", "g2", "g3"]) {
    expect(placed(layout, id).x).toBe(b.x);
    expect(placed(layout, id).y).toBeGreaterThan(b.y + b.height);
  }
  expect(new Set(["g1", "g2", "g3"].map((id) => placed(layout, id).y)).size).toBe(3);
  const toC = conditionPath(layout, "g1", "c");
  expect(toC.at(-1)!.x).toBeGreaterThan(placed(layout, "c").x);
  expect(conditionPath(layout, "a", "g1").at(-1)).toEqual({
    x: placed(layout, "g1").x,
    y: placed(layout, "g1").y + placed(layout, "g1").height / 2,
  });
  expectNoNodeCrossed(layout);
});

test("gate를 거쳐야 하는 작업은 가짜 blocks 선 없이 다음 열에 두고, gate끼리만 이어져도 노드를 유지한다", () => {
  const layout = conditionLayout(
    executionOrder(
      [issue("a"), issue("b"), issue("g", "gate")],
      [blocks("g", "a"), blocks("b", "g")],
    ),
    new Map(),
  );
  expect(placed(layout, "b").x).toBe(COLUMN_STEP);
  expect(layout.edges.map(({ from, to }) => `${from}->${to}`).sort()).toEqual(["a->g", "g->b"]);
  expect(layout.edges.every(({ condition }) => condition)).toBe(true);
  expectNoNodeCrossed(layout);

  const gates = conditionLayout(
    executionOrder([issue("g1", "gate"), issue("g2", "gate")], [blocks("g2", "g1")]),
    new Map(),
  );
  expect(gates.nodes).toHaveLength(2);
  expect(gates.edges).toHaveLength(1);
  expectNoNodeCrossed(gates);
});

test("gate가 없으면 기존 배치를 그대로 쓴다", () => {
  const order = executionOrder([issue("a"), issue("b")], [blocks("b", "a")]);
  expect(conditionLayout(order, new Map())).toEqual(layeredLayout(order));
});
