import type { Issue, IssueDependency } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { executionOrder } from "./executionOrder";

function issue(id: string, fields: Partial<Issue> = {}): Issue {
  return {
    id,
    title: id,
    status: "open",
    priority: 2,
    issueType: "task",
    createdAt: 0,
    ...fields,
  } as Issue;
}

/** [먼저 끝나야 하는 이슈, 기다리는 이슈]를 bd의 blocks 의존으로 바꿉니다. */
function blocks(...pairs: [string, string][]): IssueDependency[] {
  return pairs.map(([before, after]) => ({ issueId: after, dependsOnId: before, type: "blocks" }));
}

const layerIds = (layers: Issue[][]) => layers.map((layer) => layer.map((it) => it.id));

test("blocks로 이어진 이슈를 먼저 할 것부터 layer에 두고, blocks 관계가 없는 이슈는 개수만 센다", () => {
  const order = executionOrder(
    [issue("c"), issue("a"), issue("b"), issue("alone")],
    blocks(["a", "b"], ["b", "c"]),
  );

  expect(order.components.map((component) => layerIds(component.layers))).toEqual([
    [["a"], ["b"], ["c"]],
  ]);
  expect(order.components[0]?.edges).toEqual([
    { from: "a", to: "b" },
    { from: "b", to: "c" },
  ]);
  expect(order.unrelated).toBe(1);
});

test("여러 이슈를 기다리는 이슈는 가장 늦게 끝나는 이슈 다음 layer에 둔다", () => {
  const order = executionOrder(
    [issue("a"), issue("b"), issue("c")],
    blocks(["a", "b"], ["b", "c"], ["a", "c"]),
  );

  expect(layerIds(order.components[0]!.layers)).toEqual([["a"], ["b"], ["c"]]);
});

test("서로 기다리는 순환은 한 layer에 함께 두고, 순환을 기다리는 이슈는 그 다음 layer에 둔다", () => {
  const order = executionOrder(
    [issue("a"), issue("b"), issue("c"), issue("d")],
    blocks(["a", "b"], ["b", "c"], ["c", "b"], ["c", "d"]),
  );

  expect(layerIds(order.components[0]!.layers)).toEqual([["a"], ["b", "c"], ["d"]]);
});

test("blocks가 아닌 관계와 목록 밖 이슈와의 관계는 그리지 않는다", () => {
  const order = executionOrder(
    [issue("a"), issue("b")],
    [
      { issueId: "b", dependsOnId: "a", type: "parent-child" },
      { issueId: "b", dependsOnId: "closed-or-filtered", type: "blocks" },
    ],
  );

  expect(order).toEqual({ components: [], unrelated: 2 });
});

test("이어지지 않은 묶음은 이슈가 많은 것부터 둔다", () => {
  const order = executionOrder(
    [issue("s-1"), issue("s-2"), issue("b-1"), issue("b-2"), issue("b-3")],
    blocks(["s-1", "s-2"], ["b-1", "b-2"], ["b-2", "b-3"]),
  );

  expect(order.components.map((component) => layerIds(component.layers))).toEqual([
    [["b-1"], ["b-2"], ["b-3"]],
    [["s-1"], ["s-2"]],
  ]);
});

test("첫 layer는 우선순위 순으로, 다음 layer는 기다리는 이슈들의 앞 layer 위치 평균 순으로 둔다", () => {
  const order = executionOrder(
    [
      issue("low", { priority: 3 }),
      issue("high", { priority: 0 }),
      issue("after-low"),
      issue("join"),
      issue("after-high"),
    ],
    blocks(["low", "after-low"], ["high", "after-high"], ["high", "join"], ["low", "join"]),
  );

  expect(layerIds(order.components[0]!.layers)).toEqual([
    ["high", "low"],
    ["after-high", "join", "after-low"],
  ]);
});
