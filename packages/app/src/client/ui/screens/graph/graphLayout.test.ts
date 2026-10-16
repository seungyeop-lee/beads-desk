import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import type { ExecutionOrder } from "@/client/modules/graph/domain/executionOrder";
import {
  centerLayout,
  COLUMN_STEP,
  COMPONENT_GAP,
  layeredLayout,
  NODE_WIDTH,
  ROW_GAP,
} from "./graphLayout";

const slot = (id: string) => ({ issue: { id } as Issue });

test("layer는 왼쪽에서 오른쪽으로, layer 안의 이슈는 노드 높이에 간격을 더해 위에서 아래로 두고, 묶음은 앞 묶음의 가장 긴 layer 아래에 쌓는다", () => {
  const order: ExecutionOrder = {
    components: [
      { layers: [[slot("a")], [slot("b"), slot("c")]], edges: [] },
      { layers: [[slot("d")]], edges: [] },
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

test("간선이 지나가는 자리에는 노드를 두지 않고, 그 간선이 자리의 왼쪽 끝부터 오른쪽 끝까지 노드 높이 가운데로 지나가게 한다", () => {
  const skip = { from: "a", to: "d" };
  const order: ExecutionOrder = {
    components: [
      {
        layers: [
          [slot("a")],
          [slot("b"), { passing: skip }],
          [slot("c"), { passing: skip }],
          [slot("d")],
        ],
        edges: [{ from: "a", to: "b" }, skip],
      },
    ],
    unlinked: [],
    cycles: [],
  };

  const nodeHeight = 80;
  const layout = layeredLayout(order, nodeHeight);

  expect(layout.nodes.map((node) => node.issue.id)).toEqual(["a", "b", "c", "d"]);
  const y = nodeHeight + ROW_GAP + nodeHeight / 2;
  expect(layout.edges).toEqual([
    { from: "a", to: "b", passes: [] },
    {
      from: "a",
      to: "d",
      passes: [
        { left: COLUMN_STEP, right: COLUMN_STEP + NODE_WIDTH, y },
        { left: 2 * COLUMN_STEP, right: 2 * COLUMN_STEP + NODE_WIDTH, y },
      ],
    },
  ]);
});

test.each([76, 96])(
  "높이 %i인 같은 열 순환은 노드와 단계 좌표를 유지하고 간선마다 다음 열 앞의 빈 공간에 다른 우회 자리를 둔다",
  (nodeHeight) => {
    const cycle = [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
      { from: "c", to: "a" },
    ];
    const forward = { from: "c", to: "d" };
    const layout = layeredLayout(
      {
        components: [
          { layers: [[slot("a"), slot("b"), slot("c")], [slot("d")]], edges: [...cycle, forward] },
        ],
        unlinked: [],
        cycles: [["a", "b", "c", "a"]],
      },
      nodeHeight,
    );
    expect(layout.nodes.map(({ issue, x, y }) => [issue.id, x, y])).toEqual([
      ["a", 0, 0],
      ["b", 0, nodeHeight + ROW_GAP],
      ["c", 0, 2 * (nodeHeight + ROW_GAP)],
      ["d", COLUMN_STEP, 0],
    ]);
    const bypasses = layout.edges.slice(0, 3).map(({ bypassX }) => bypassX!);
    expect(new Set(bypasses).size).toBe(cycle.length);
    for (const x of bypasses) {
      expect(x).toBeGreaterThan(NODE_WIDTH);
      expect(x).toBeLessThan(COLUMN_STEP);
    }
    expect(layout.edges.at(-1)).toEqual({ ...forward, passes: [] });
  },
);

test("긴 제목의 실제 높이를 같은 행과 다음 묶음에 반영하고 간선 통과 자리도 비운다", () => {
  const skip = { from: "a", to: "d" };
  const layout = layeredLayout(
    {
      components: [
        {
          layers: [[slot("a"), slot("b")], [slot("c"), { passing: skip }], [slot("d")]],
          edges: [skip],
        },
        { layers: [[slot("e")]], edges: [] },
      ],
      unlinked: [],
      cycles: [],
    },
    76,
    new Map([
      ["a", 180],
      ["c", 220],
    ]),
  );
  const nodes = new Map(layout.nodes.map((node) => [node.issue.id, node]));
  expect(nodes.get("a")!.height).toBe(180);
  expect(nodes.get("b")!.y).toBe(220 + ROW_GAP);
  expect(layout.edges[0]!.passes[0]!.y).toBe(220 + ROW_GAP + 38);
  expect(nodes.get("e")!.y).toBe(220 + 76 + ROW_GAP * 2 + COMPONENT_GAP);
});

test("보조 노드는 사슬 아래에 두고 기존 사슬 좌표와 blocks 간선을 보존한다", () => {
  const center = { id: "center" } as Issue;
  const next = { id: "next" } as Issue;
  const base = {
    nodes: [
      { issue: center, x: 0, y: 0, height: 100 },
      { issue: next, x: COLUMN_STEP, y: 0, height: 100 },
    ],
    edges: [{ from: "center", to: "next", passes: [] }],
    nodeHeight: 76,
  };
  const auxiliary = [{ from: "center", to: "extra", type: "related" as const }];
  const result = centerLayout(
    base,
    [{ id: "extra" } as Issue],
    auxiliary,
    center,
    new Map([["extra", 120]]),
  );
  expect(result.nodes.slice(0, 2)).toEqual(base.nodes);
  expect(result.edges).toBe(base.edges);
  expect(result.nodes[2]).toMatchObject({ y: 100 + COMPONENT_GAP, height: 120 });
  expect(centerLayout(base, [], [], center, new Map())).toBe(base);
});

test("보조 관계만 있으면 기준과 연결 이슈를 중복 없이 배치하고 아무 관계도 없으면 빈 상태를 유지한다", () => {
  const center = { id: "center" } as Issue;
  const base = { nodes: [], edges: [], nodeHeight: 76 };
  expect(
    centerLayout(
      base,
      [{ id: "extra" } as Issue],
      [{ from: "center", to: "extra", type: "related" }],
      center,
      new Map(),
    ).nodes.map(({ issue }) => issue.id),
  ).toEqual(["center", "extra"]);
  expect(centerLayout(base, [], [], center, new Map()).nodes).toEqual([]);
});
