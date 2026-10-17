import type { Issue, IssueDependency } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { centerGraph } from "@/client/modules/graph/domain/centerGraph";
import { epicPlan } from "@/client/modules/graph/domain/epicPlan";
import type { GraphData } from "@/shared/contract/graph";
import { ARROW_LENGTH, auxiliaryEdgeLook, hasArrow } from "./edgeLook";
import { type GraphLayout, NODE_HEIGHT, NODE_WIDTH, type Point } from "./graphLayout";
import { type GraphLayoutInput, layoutGraph } from "./layoutGraph";

const issue = (id: string, issueType = "task"): Issue =>
  ({ id, issueType, status: "open", title: id, priority: 2, createdAt: 0 }) as Issue;

/** [기다리는 이슈, 먼저 끝나야 하는 이슈, 관계]입니다. 관계를 적지 않으면 blocks입니다. */
type Link = [string, string, IssueDependency["type"]?];

function graphData(issues: Issue[], links: Link[], epic?: string): GraphData {
  return {
    issues,
    dependencies: links.map(([issueId, dependsOnId, type = "blocks"]) => ({
      issueId,
      dependsOnId,
      type,
      createdAt: 0,
    })),
    ancestorEpics: epic
      ? Object.fromEntries(issues.filter(({ id }) => id !== epic).map(({ id }) => [id, [epic]]))
      : {},
  };
}

function centerInput(
  data: GraphData,
  centerId: string,
  heights: Record<string, number>,
): GraphLayoutInput {
  const graph = centerGraph(data, centerId);
  return {
    order: graph.order,
    heights: new Map(Object.entries(heights)),
    nodeHeight: NODE_HEIGHT,
    auxiliary: {
      center: data.issues.find(({ id }) => id === centerId),
      issues: graph.extra,
      edges: graph.auxiliary,
    },
  };
}

// 기준 이슈를 gate 셋이 막고, 그 가운데 하나는 후속 작업도 막으며, 다른 하나는 gate 자신의 선행 gate가 있습니다.
// 체인 밖 관련 이슈 둘과 양방향 발견 이슈가 있고, 카드 높이가 서로 다릅니다.
const GATES = centerInput(
  graphData(
    [
      "before",
      "center",
      "after",
      "related-1",
      "related-2",
      "origin",
      "found",
      ...["shared", "second", "third", "gate-before"].map((id) => `gate:${id}`),
    ].map((id) => (id.startsWith("gate:") ? issue(id.slice(5), "gate") : issue(id))),
    [
      ["center", "before"],
      ["after", "center"],
      ["center", "shared"],
      ["after", "shared"],
      ["shared", "before"],
      ["center", "second"],
      ["second", "gate-before"],
      ["center", "third"],
      ["center", "related-1", "related"],
      ["related-2", "center", "related"],
      ["center", "origin", "discovered-from"],
      ["found", "center", "discovered-from"],
    ],
  ),
  "center",
  { center: 140, shared: 120, "related-1": 180, after: 100 },
);

// 관련·발견 이슈만 있어, 예전 배치에서는 기준 아래 한 줄에 세 개씩 나열되던 경우입니다.
const AUXILIARY_ONLY = centerInput(
  graphData(
    ["hub", "note-1", "note-2", "note-3", "found-1", "found-2", "origin"].map((id) => issue(id)),
    [
      ["hub", "note-1", "related"],
      ["hub", "note-2", "related"],
      ["note-3", "hub", "related"],
      ["found-1", "hub", "discovered-from"],
      ["found-2", "hub", "discovered-from"],
      ["hub", "origin", "discovered-from"],
    ],
  ),
  "hub",
  { "note-2": 150 },
);

// 에픽 계획: 여러 열을 건너뛰는 간선이 있는 사슬, 순환과 그 후속, 에픽 밖 gate가 막는 작업이 서로 다른 묶음입니다.
const EPIC = epicPlan(
  graphData(
    [
      issue("epic", "epic"),
      ...["a", "b", "c", "d", "x", "y", "z", "w", "p", "q"].map((id) => issue(id)),
      issue("gx", "gate"),
    ],
    [
      ["b", "a"],
      ["c", "a"],
      ["c", "b"],
      ["d", "a"],
      ["d", "c"],
      ["y", "x"],
      ["z", "y"],
      ["x", "z"],
      ["w", "z"],
      ["p", "gx"],
      ["gx", "q"],
    ],
    "epic",
  ),
  "epic",
);
const EPIC_INPUT: GraphLayoutInput = {
  order: EPIC.order,
  heights: new Map([
    ["b", 200],
    ["x", 160],
  ]),
  nodeHeight: 96,
};

const FIXTURES = { GATES, AUXILIARY_ONLY, EPIC: EPIC_INPUT };

type DrawnEdge = { id: string; from: string; to: string; points: Point[]; arrow: boolean };

function drawnEdges(layout: GraphLayout): DrawnEdge[] {
  return [
    ...layout.edges.map(({ from, to, points }) => ({
      id: `${from}->${to}`,
      from,
      to,
      points,
      arrow: true,
    })),
    ...layout.auxiliary.map(({ from, to, type, points }) => ({
      id: `${type}:${from}->${to}`,
      from,
      to,
      points,
      arrow: hasArrow(auxiliaryEdgeLook(type).kind),
    })),
  ];
}

const segments = (points: Point[]) => points.slice(1).map((end, at) => [points[at]!, end] as const);
const node = (layout: GraphLayout, id: string) =>
  layout.nodes.find(({ issue }) => issue.id === id)!;

for (const [name, input] of Object.entries(FIXTURES)) {
  test(`${name}: 모든 간선은 가로·세로 선분으로만 꺾이고 어떤 노드 안으로도 지나가지 않는다`, () => {
    const layout = layoutGraph(input);
    for (const edge of drawnEdges(layout)) {
      expect(edge.points.length, `${edge.id}`).toBeGreaterThanOrEqual(2);
      for (const [start, end] of segments(edge.points)) {
        expect(start.x === end.x || start.y === end.y, `${edge.id} 선분`).toBe(true);
        for (const { issue, x, y, height } of layout.nodes) {
          const crosses =
            Math.max(start.x, end.x) > x &&
            Math.min(start.x, end.x) < x + NODE_WIDTH &&
            Math.max(start.y, end.y) > y &&
            Math.min(start.y, end.y) < y + height;
          expect(crosses, `${edge.id}가 ${issue.id}를 지남`).toBe(false);
        }
      }
    }
  });

  test(`${name}: 서로 다른 간선은 같은 선 위의 구간과 노드 변 위의 점을 함께 쓰지 않는다`, () => {
    const edges = drawnEdges(layoutGraph(input));
    for (const a of edges)
      for (const b of edges) {
        if (a === b) continue;
        for (const [p, q] of segments(a.points))
          for (const [r, s] of segments(b.points)) {
            const sharedLength =
              p.y === q.y && r.y === s.y && p.y === r.y
                ? overlap([p.x, q.x], [r.x, s.x])
                : p.x === q.x && r.x === s.x && p.x === r.x
                  ? overlap([p.y, q.y], [r.y, s.y])
                  : 0;
            expect(sharedLength, `${a.id}와 ${b.id}`).toBe(0);
          }
      }
    const ends = edges.flatMap(({ points }) => [points[0]!, points.at(-1)!]);
    expect(new Set(ends.map(({ x, y }) => `${x},${y}`)).size).toBe(ends.length);
  });

  test(`${name}: 화살촉이 있는 간선은 도착 노드의 변에 수직으로, 화살촉보다 긴 마지막 구간으로 들어간다`, () => {
    const layout = layoutGraph(input);
    for (const edge of drawnEdges(layout).filter(({ arrow }) => arrow)) {
      const target = node(layout, edge.to);
      const [before, end] = edge.points.slice(-2) as [Point, Point];
      const onLeftOrRight = end.x === target.x || end.x === target.x + NODE_WIDTH;
      const onTopOrBottom = end.y === target.y || end.y === target.y + target.height;
      expect(onLeftOrRight !== onTopOrBottom, `${edge.id}의 끝점은 변 하나 위에 있다`).toBe(true);
      expect(onLeftOrRight ? before.y === end.y : before.x === end.x, `${edge.id} 수직`).toBe(true);
      expect(Math.abs(before.x - end.x) + Math.abs(before.y - end.y)).toBeGreaterThan(ARROW_LENGTH);
    }
  });

  test(`${name}: 같은 입력을 두 번 넣으면 같은 결과가 나온다`, () => {
    expect(layoutGraph(input)).toEqual(layoutGraph(input));
  });
}

/** 같은 열에서 anchor 바로 아래에 gate가 있고, 그 사이에는 gate만 있습니다. */
function expectBelow(layout: GraphLayout, gate: string, anchor: string) {
  const [g, a] = [node(layout, gate), node(layout, anchor)];
  expect(g.x, `${gate}는 ${anchor}와 같은 열`).toBe(a.x);
  expect(g.y).toBeGreaterThan(a.y + a.height);
  const between = layout.nodes.filter(({ x, y }) => x === a.x && y > a.y && y < g.y);
  expect(between.map(({ issue }) => issue.issueType)).toEqual(between.map(() => "gate"));
}

test("gate는 막는 작업 가운데 가장 왼쪽 작업과 같은 열 바로 아래에 두고, 다른 blocks 간선은 왼쪽 열에서 오른쪽 열로 간다", () => {
  const layout = layoutGraph(GATES);
  for (const gate of ["shared", "second", "third", "gate-before"])
    expectBelow(layout, gate, "center");
  const gates = new Set(["shared", "second", "third", "gate-before"]);
  for (const { from, to } of layout.edges.filter(
    ({ from, to }) => !gates.has(from) && !gates.has(to),
  ))
    expect(node(layout, from).x, `${from}->${to}`).toBeLessThan(node(layout, to).x);

  const epic = layoutGraph(EPIC_INPUT);
  expectBelow(epic, "gx", "p");
});

test("순환에 속한 이슈는 한 열에 두고, 순환이 아닌 blocks 간선은 왼쪽 열에서 오른쪽 열로 간다", () => {
  const layout = layoutGraph(EPIC_INPUT);
  expect(new Set(["x", "y", "z"].map((id) => node(layout, id).x)).size).toBe(1);
  const cycle = new Set(["x", "y", "z"]);
  for (const { from, to } of layout.edges.filter(
    ({ from, to }) => !(cycle.has(from) && cycle.has(to)) && from !== "gx" && to !== "gx",
  ))
    expect(node(layout, from).x, `${from}->${to}`).toBeLessThan(node(layout, to).x);
});

test("발견 이슈는 발견한 작업보다 오른쪽 열에 두고, 체인 밖 관련·발견 이슈는 한 줄에 나열하지 않고 연결된 노드 가까이 둔다", () => {
  for (const input of [GATES, AUXILIARY_ONLY]) {
    const layout = layoutGraph(input);
    for (const { from, to, type } of layout.auxiliary.filter(
      ({ type }) => type === "discovered-from",
    ))
      expect(node(layout, from).x, `${type}:${from}->${to}`).toBeLessThan(node(layout, to).x);
  }
  const layout = layoutGraph(AUXILIARY_ONLY);
  const hub = node(layout, "hub");
  for (const id of ["note-1", "note-2", "note-3"]) expect(node(layout, id).x).toBe(hub.x);
});

test("에픽 계획의 열 좌표는 gate를 뺀 작업 열마다 하나이고, 열의 노드는 그 좌표에 놓인다", () => {
  const layout = layoutGraph(EPIC_INPUT);
  expect(layout.columns).toHaveLength(EPIC.stages.total);
  expect(layout.columns).toEqual(layout.columns.toSorted((a, b) => a - b));
  for (const id of ["a", "b", "c", "d"])
    expect(layout.columns.indexOf(node(layout, id).x), `${id}`).toBe(
      ["a", "b", "c", "d"].indexOf(id),
    );
});

test("blocks 관계 없이 관련·발견 관계만 있어도 기준 이슈를 그리고, 아무 관계가 없으면 노드를 두지 않는다", () => {
  expect(
    layoutGraph(AUXILIARY_ONLY)
      .nodes.map(({ issue }) => issue.id)
      .toSorted(),
  ).toEqual(["found-1", "found-2", "hub", "note-1", "note-2", "note-3", "origin"]);
  const empty = centerInput(graphData([issue("alone")], []), "alone", {});
  expect(layoutGraph(empty)).toEqual({ nodes: [], edges: [], auxiliary: [], columns: [] });
});

function overlap([a, b]: [number, number], [c, d]: [number, number]) {
  return Math.max(
    0,
    Math.min(Math.max(a, b), Math.max(c, d)) - Math.max(Math.min(a, b), Math.min(c, d)),
  );
}
