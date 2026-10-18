import { createHash } from "node:crypto";
import type { IssueDependency } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import type { GraphData } from "@/shared/contract/graph";
import { issue } from "@/shared/domain/issues/issueFixture";
import { centerGraph } from "./centerGraph";
import { epicPlan } from "./epicPlan";
import { NODE_HEIGHT, PLAN_NODE_HEIGHT } from "./graphLayout";
import { type GraphLayoutInput, layoutGraph } from "./layoutGraph";

// 계산 속도만 바꾸는 엔진 수정이 큰 그래프의 배치를 바꾸지 않았는지 확인합니다.
// 기대값은 같은 입력으로 계산한 노드 좌표와 꺾임점 전체의 SHA-256 앞 16자리입니다.
// 배치 규칙을 일부러 바꿨다면 바뀐 배치를 화면이나 layoutGraph.test.ts로 확인한 뒤, 실패 메시지에 나온 값으로 기대값을 바꿉니다.
const CASES: [name: string, input: () => GraphLayoutInput, fingerprint: string][] = [
  ["에픽 이슈 약 200개, seed 1", () => epicInput(largeGraphData(1, 1)), "e7742d0e9980e276"],
  ["에픽 이슈 약 200개, seed 2", () => epicInput(largeGraphData(2, 1)), "6182d793371442d5"],
  ["에픽 이슈 약 200개, seed 3", () => epicInput(largeGraphData(3, 1)), "0a57ff7bd13031b8"],
  ["에픽 이슈 약 400개", () => epicInput(largeGraphData(1, 2)), "cda6d6268f18382d"],
  ["에픽 이슈 약 800개", () => epicInput(largeGraphData(1, 4)), "5c1277a8e29bdbbc"],
  ["사슬 가운데 기준 이슈", () => centerInput(largeGraphData(1, 1), "t6-0"), "31aeb1c1f4739952"],
  [
    "사슬 처음 기준 이슈",
    () => centerInput(largeGraphData(1, 1, "t0-0"), "t0-0"),
    "8af0e425ef4bbeb8",
  ],
  [
    "사슬 끝 기준 이슈",
    () => centerInput(largeGraphData(1, 1, "t11-0"), "t11-0"),
    "903df0b4743bce5b",
  ],
];

test.each(CASES)("큰 그래프의 배치가 그대로다: %s", (_, input, fingerprint) => {
  const layout = layoutGraph(input());
  // nodeOf는 이미 담은 노드의 색인이므로 해시에서 제외하고, 노드 좌표와 꺾임점만 남깁니다.
  const json = JSON.stringify(layout, (key, value: unknown) =>
    key === "nodeOf" ? undefined : key === "issue" ? (value as { id: string }).id : value,
  );
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
