import type { Issue, IssueDependency } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import type { GraphData } from "@/shared/contract/graph";
import { epicPlan } from "./epicPlan";
import { layerIssues } from "./layeredGraph";

function issue(id: string, fields: Partial<Issue> = {}): Issue {
  return { id, status: "open", issueType: "task", priority: 2, createdAt: 0, ...fields } as Issue;
}

/** [먼저 끝나야 하는 이슈, 기다리는 이슈]를 bd의 blocks 의존으로 바꿉니다. */
function blocks(...pairs: [string, string][]): IssueDependency[] {
  return pairs.map(([before, after]) => ({
    issueId: after,
    dependsOnId: before,
    type: "blocks",
    createdAt: 0,
  }));
}

/** epic의 후손 이슈(children)와 에픽 밖 이슈(others)로 그래프 데이터를 만듭니다. */
function graph(children: Issue[], others: Issue[], dependencies: IssueDependency[]): GraphData {
  return {
    issues: [issue("epic", { issueType: "epic" }), ...children, ...others],
    dependencies,
    ancestorEpics: Object.fromEntries(children.map((child) => [child.id, ["epic"]])),
  };
}

const layerIds = (plan: ReturnType<typeof epicPlan>) =>
  plan.order.components.map((component) =>
    component.layers.map((layer) => layerIssues(layer).map((it) => it.id)),
  );

test("닫힌 이슈도 단계에 넣고, 닫히지 않은 이슈가 남은 가장 왼쪽 단계를 진행 중으로 본다", () => {
  const plan = epicPlan(
    graph(
      [
        issue("a", { status: "closed" }),
        issue("b", { status: "closed" }),
        issue("c"),
        issue("d"),
        issue("x", { status: "closed" }),
        issue("y"),
      ],
      [],
      blocks(["a", "b"], ["b", "c"], ["c", "d"], ["x", "y"]),
    ),
    "epic",
  );

  expect(layerIds(plan)).toEqual([
    [["a"], ["b"], ["c"], ["d"]],
    [["x"], ["y"]],
  ]);
  expect(plan.stages).toEqual({ total: 4, current: 1 });
});

test("모든 단계의 이슈가 닫혔으면 진행 중인 단계가 없고, 그린 이슈가 없으면 단계도 없다", () => {
  const done = epicPlan(
    graph(
      [issue("a", { status: "closed" }), issue("b", { status: "closed" })],
      [],
      blocks(["a", "b"]),
    ),
    "epic",
  );
  const empty = epicPlan(graph([issue("a")], [], []), "epic");

  expect(done.stages).toEqual({ total: 2, current: null });
  expect(empty.stages).toEqual({ total: 0, current: null });
});

test("에픽 안에서 blocks 관계가 없는 후손 이슈는 선후 관계 없음으로 모으고, 닫히지 않은 이슈를 앞에 둔다", () => {
  const plan = epicPlan(
    graph(
      [
        issue("a"),
        issue("b"),
        issue("done", { status: "closed", priority: 0 }),
        issue("low", { priority: 3 }),
        issue("high", { priority: 1 }),
        issue("before-other"),
      ],
      [issue("other")],
      blocks(["a", "b"], ["before-other", "other"]),
    ),
    "epic",
  );

  expect(plan.unordered.map((it) => it.id)).toEqual(["high", "before-other", "low", "done"]);
  expect(layerIds(plan)).toEqual([[["a"], ["b"]]]);
});

test.each(["feature", "epic"])(
  "선후 관계가 없는 %s 유형은 자식 유무와 관계없이 목록에서 빼고, 자식이 있는 task는 남긴다",
  (issueType) => {
    const plan = epicPlan(
      graph(
        [
          issue("group", { issueType }),
          issue("empty-group", { issueType }),
          issue("group-child", { parent: "group" }),
          issue("task-parent"),
          issue("task-child", { parent: "task-parent" }),
          issue("task"),
        ],
        [],
        [
          { issueId: "group-child", dependsOnId: "group", type: "parent-child", createdAt: 0 },
          { issueId: "task-child", dependsOnId: "task-parent", type: "parent-child", createdAt: 0 },
        ],
      ),
      "epic",
    );

    expect(plan.unordered.map((it) => it.id)).toEqual([
      "group-child",
      "task",
      "task-child",
      "task-parent",
    ]);
    expect(plan.stages).toEqual({ total: 0, current: null });
  },
);

test("blocks로 연결된 feature·epic은 단계에 남고, 연결되지 않은 묶음을 빼도 단계와 진행 요약은 같다", () => {
  const connected = [
    issue("feature", { issueType: "feature", status: "closed" }),
    issue("nested-epic", { issueType: "epic" }),
    issue("task"),
  ];
  const dependencies = blocks(["feature", "nested-epic"], ["nested-epic", "task"]);
  const before = epicPlan(graph(connected, [], dependencies), "epic");
  const withUnlinkedGroups = epicPlan(
    graph(
      [
        ...connected,
        issue("unlinked-feature", { issueType: "feature" }),
        issue("unlinked-epic", { issueType: "epic" }),
      ],
      [],
      dependencies,
    ),
    "epic",
  );

  expect(layerIds(withUnlinkedGroups)).toEqual([[["feature"], ["nested-epic"], ["task"]]]);
  expect(layerIds(withUnlinkedGroups)).toEqual(layerIds(before));
  expect(withUnlinkedGroups.stages).toEqual({ total: 3, current: 1 });
  expect(withUnlinkedGroups.stages).toEqual(before.stages);
  expect(withUnlinkedGroups.unordered).toEqual([]);
});

test("후손 이슈를 직접 막는 에픽 밖 이슈를 outside로 담아 단계에 넣고, 그 이슈를 막는 이슈는 따라가지 않는다", () => {
  const plan = epicPlan(
    graph(
      [issue("a"), issue("b")],
      [issue("ext"), issue("ext-before"), issue("ext-after")],
      blocks(["ext-before", "ext"], ["ext", "a"], ["a", "b"], ["b", "ext-after"]),
    ),
    "epic",
  );

  expect([...plan.outside]).toEqual(["ext"]);
  expect(layerIds(plan)).toEqual([[["ext"], ["a"], ["b"]]]);
  expect(plan.order.components[0]?.edges).toEqual([
    { from: "ext", to: "a" },
    { from: "a", to: "b" },
  ]);
  expect(plan.stages).toEqual({ total: 3, current: 0 });
});

test("gate는 단계에 넣지 않아, gate만 있는 열은 단계 수에서 빠지고 열린 gate가 있어도 현재 단계로 보지 않는다", () => {
  const plan = epicPlan(
    graph(
      [issue("a", { status: "closed" }), issue("b"), issue("inner", { issueType: "gate" })],
      [issue("outer", { issueType: "gate" })],
      blocks(["a", "inner"], ["inner", "b"], ["outer", "a"]),
    ),
    "epic",
  );

  expect(layerIds(plan)).toEqual([[["outer"], ["a"], ["inner"], ["b"]]]);
  expect([...plan.outside]).toEqual(["outer"]);
  expect(plan.stages).toEqual({ total: 2, current: 1 });
});
