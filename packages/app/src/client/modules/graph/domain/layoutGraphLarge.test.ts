import { createHash } from "node:crypto";
import type { IssueDependency } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import type { GraphData } from "@/shared/contract/graph";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { centerGraph } from "./centerGraph";
import { epicPlan } from "./epicPlan";
import { overlappingPair, routeProblem } from "./graphGeometry.testkit";
import { NODE_HEIGHT, PLAN_NODE_HEIGHT } from "./graphLayout";
import { type GraphLayoutInput, layoutGraph } from "./layoutGraph";

// 에픽 밖의 out0는 선행 조건 없이 작업 하나만 막으므로, 이제는 그 작업의 카드 안에 들어갑니다.
const WITH_GATE: [string, () => GraphLayoutInput][] = [
  ["에픽 이슈 약 200개, seed 1", () => epicInput(largeGraphData(1, 1))],
  ["에픽 이슈 약 200개, seed 2", () => epicInput(largeGraphData(2, 1))],
  ["에픽 이슈 약 200개, seed 3", () => epicInput(largeGraphData(3, 1))],
  ["에픽 이슈 약 400개", () => epicInput(largeGraphData(1, 2))],
  ["에픽 이슈 약 800개", () => epicInput(largeGraphData(1, 4))],
  ["사슬 끝 기준 이슈", () => centerInput(largeGraphData(1, 1, "t11-0"), "t11-0")],
];

test.each(WITH_GATE)(
  "큰 그래프에서도 gate 편입 뒤 나머지 노드와 간선을 보존한다: %s",
  (_, makeInput) => {
    const input = makeInput();
    const layout = layoutGraph(input);
    const { nodes, edges, auxiliary } = layout;
    const blocks = input.order.components.flatMap((component) => component.edges);
    const gateEdge = blocks.find(({ from }) => from === "out0")!;
    const issues = [
      ...input.order.components.flatMap(({ layers }) => layers.flat()),
      ...(input.auxiliary?.issues ?? []),
    ];
    expect(nodes.map(({ issue }) => issue.id).toSorted()).toEqual(
      issues
        .map(({ id }) => id)
        .filter((id) => id !== "out0")
        .toSorted(),
    );
    const owner = layout.nodeOf.get(gateEdge.to)!;
    expect(owner.sections?.gates.map(({ id }) => id)).toEqual(["out0"]);
    expect(layout.nodeOf.get("out0")).toBe(owner);
    expect(edges.map(({ from, to }) => ({ from, to }))).toEqual(
      blocks.filter(({ from }) => from !== "out0"),
    );
    expect(auxiliary.map(({ from, to, type }) => ({ from, to, type }))).toEqual(
      input.auxiliary?.edges ?? [],
    );
    expect(overlappingPair(layout)).toBeUndefined();
    expect(routeProblem(layout)).toBeUndefined();
  },
);

// out0가 보이지 않는 기준 이슈에서는 기존 좌표와 꺾임점의 SHA-256 앞 16자리까지 보존합니다.
test.each([
  ["t6-0", "31aeb1c1f4739952"],
  ["t0-0", "8af0e425ef4bbeb8"],
] as const)("큰 그래프에서 편입할 gate가 없으면 기존 배치를 유지한다: %s", (id, fingerprint) => {
  const { nodes, edges, auxiliary, columns } = layoutGraph(
    centerInput(largeGraphData(1, 1, id), id),
  );
  const json = JSON.stringify({
    nodes: nodes.map(({ issue, x, y, height }) => ({ issue: issue.id, x, y, height })),
    edges,
    auxiliary,
    columns,
  });
  expect(createHash("sha256").update(json).digest("hex").slice(0, 16)).toBe(fingerprint);
});

/**
 * 에픽 하나 아래에 열 12개, 열마다 작업 15개를 두고 scale배만큼 늘린 합성 그래프입니다. scale이 1이면 이슈 약 200개, blocks 간선 약 290개입니다.
 * 여러 열을 건너는 간선, 작업 아래 gate와 gate끼리의 사슬, 순환, 에픽 밖에서 막는 이슈, 기준 이슈에 이어진 관련·발견 이슈를 섞습니다.
 * 같은 seed와 scale이면 언제나 같은 그래프를 만듭니다.
 */
function largeGraphData(seed: number, scale: number, centerId = "t6-0"): GraphData {
  const stageCount = Math.round(12 * Math.sqrt(scale));
  const tasksPerStage = Math.round(15 * Math.sqrt(scale));
  const gateCount = Math.round(12 * scale);
  const random = mulberry32(seed);
  const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)]!;
  const issues = [issue("epic", { issueType: "epic" })];
  const dependencies: IssueDependency[] = [];
  const link = (issueId: string, dependsOnId: string, type: IssueDependency["type"] = "blocks") =>
    dependencies.push({ issueId, dependsOnId, type, createdAt: 0 });

  const stages = Array.from({ length: stageCount }, (_, stage) =>
    Array.from({ length: tasksPerStage }, (_, at) => `t${stage}-${at}`),
  );
  issues.push(...stages.flat().map((id) => issue(id)));
  stages.forEach((tasks, stage) => {
    if (stage === 0) return;
    for (const task of tasks) {
      link(task, pick(stages[stage - 1]!));
      if (random() < 0.5)
        link(task, pick(stages[Math.max(0, stage - 2 - Math.floor(random() * 3))]!));
    }
  });
  for (let cycle = 0; cycle < 3; cycle++) {
    const members = stages[3 + cycle * 3]!.slice(0, 3);
    members.forEach((member, at) => link(members[(at + 1) % members.length]!, member));
  }
  for (let at = 0; at < gateCount; at++) {
    const id = `g${at}`;
    issues.push(issue(id, { issueType: "gate" }));
    const stage = Math.floor(random() * (stageCount - 2));
    link(id, pick(stages[stage]!));
    if (at % 3 === 2) link(`g${at - 1}`, id);
    else link(pick(stages[stage + 1 + Math.floor(random() * 2)]!), id);
  }
  for (let at = 0; at < 6; at++) {
    const id = `out${at}`;
    issues.push(issue(id, { issueType: at === 0 ? "gate" : "task" }));
    link(pick(stages[1 + Math.floor(random() * (stageCount - 1))]!), id);
  }
  for (let at = 0; at < 20; at++) {
    const id = `aux${at}`;
    issues.push(issue(id));
    if (at % 3 === 0) link(id, centerId, "discovered-from");
    else link(centerId, id, at % 3 === 1 ? "discovered-from" : "related");
  }
  const inEpic = (id: string) => id.startsWith("t") || id.startsWith("g");
  return {
    issues,
    dependencies,
    ancestorEpics: Object.fromEntries(
      issues.filter(({ id }) => inEpic(id)).map(({ id }) => [id, ["epic"]]),
    ),
  };
}

function epicInput(data: GraphData): GraphLayoutInput {
  return {
    order: epicPlan(data, "epic").order,
    heights: cardHeights(data, PLAN_NODE_HEIGHT),
    nodeHeight: PLAN_NODE_HEIGHT,
  };
}

function centerInput(data: GraphData, centerId: string): GraphLayoutInput {
  const graph = centerGraph(data, centerId);
  return {
    order: graph.order,
    heights: cardHeights(data, NODE_HEIGHT),
    nodeHeight: NODE_HEIGHT,
    auxiliary: {
      center: data.issues.find(({ id }) => id === centerId),
      issues: graph.extra,
      edges: graph.auxiliary,
    },
  };
}

/** 제목 줄 수가 다른 카드처럼, 이슈 다섯 개에 하나꼴로 카드를 더 높게 둡니다. */
function cardHeights({ issues }: GraphData, base: number): ReadonlyMap<string, number> {
  return new Map(issues.map(({ id }, at) => [id, base + (at % 5 === 0 ? 40 : 0)]));
}

/** 실행 환경과 관계없이 같은 수열을 내는 작은 의사 난수 생성기입니다. */
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
