import type { IssueDependency } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { centerGraph } from "./centerGraph";
import { executionOrder } from "./executionOrder";
import { scopedIssues } from "./graphScope";

const issues = ["before", "center", "after", "related", "origin", "found", "beyond"].map((id) =>
  issue(id),
);
const dependencies: IssueDependency[] = [
  { issueId: "center", dependsOnId: "before", type: "blocks", createdAt: 0 },
  { issueId: "after", dependsOnId: "center", type: "blocks", createdAt: 0 },
  { issueId: "center", dependsOnId: "related", type: "related", createdAt: 0 },
  { issueId: "related", dependsOnId: "center", type: "related", createdAt: 0 },
  { issueId: "center", dependsOnId: "origin", type: "discovered-from", createdAt: 0 },
  { issueId: "found", dependsOnId: "center", type: "discovered-from", createdAt: 0 },
  { issueId: "related", dependsOnId: "beyond", type: "related", createdAt: 0 },
  { issueId: "beyond", dependsOnId: "center", type: "parent-child", createdAt: 0 },
  { issueId: "related", dependsOnId: "before", type: "blocks", createdAt: 0 },
];
const data = { issues, dependencies, ancestorEpics: {} };

test("기준의 보조 관계만 양방향으로 한 번 담고 보조 관계를 다시 따라가지 않는다", () => {
  const graph = centerGraph(data, "center");
  expect(scopedIssues(data, { kind: "center", id: "center" }).map(({ id }) => id)).toEqual([
    "before",
    "center",
    "after",
    "related",
    "origin",
    "found",
  ]);
  expect(graph.extra.map(({ id }) => id)).toEqual(["related", "origin", "found"]);
  expect(graph.auxiliary).toEqual([
    { from: "center", to: "related", type: "related" },
    { from: "origin", to: "center", type: "discovered-from" },
    { from: "center", to: "found", type: "discovered-from" },
  ]);
  expect(graph.order).toEqual(executionOrder(issues.slice(0, 3), dependencies));
});

test("동일 쌍의 blocks·related·발견 관계를 모두 유지하고 보조 순환과 중복이 순서를 바꾸지 않는다", () => {
  const extra: IssueDependency[] = [
    { issueId: "center", dependsOnId: "before", type: "related", createdAt: 0 },
    { issueId: "center", dependsOnId: "before", type: "discovered-from", createdAt: 0 },
    { issueId: "before", dependsOnId: "center", type: "discovered-from", createdAt: 0 },
    { issueId: "before", dependsOnId: "center", type: "discovered-from", createdAt: 0 },
  ];
  const graph = centerGraph({ ...data, dependencies: [...dependencies, ...extra] }, "center");
  expect(graph.order).toEqual(centerGraph(data, "center").order);
  expect(graph.auxiliary.filter(({ from, to }) => [from, to].includes("before"))).toHaveLength(3);
});

test("보조 관계만 있는 기준과 발견 출처에서도 원래 방향을 보존한다", () => {
  const graph = centerGraph(data, "origin");
  expect(graph.auxiliary).toEqual([{ from: "origin", to: "center", type: "discovered-from" }]);
  expect(graph.extra.map(({ id }) => id)).toEqual(["center"]);
  expect(graph.order.components).toEqual([]);
});
