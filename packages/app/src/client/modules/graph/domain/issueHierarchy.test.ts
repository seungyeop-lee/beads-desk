import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { issueHierarchy } from "./issueHierarchy";

function issue(id: string, fields: Partial<Issue> = {}): Issue {
  return {
    id,
    title: id,
    status: "open",
    priority: 2,
    issueType: "task",
    parent: null,
    createdAt: 0,
    ...fields,
  } as Issue;
}

const rows = (issues: Issue[]) =>
  issueHierarchy(issues).rows.map((row) => [row.issue.id, row.depth]);

test("parent-child를 따라 상위 이슈 바로 아래에 하위 이슈를 한 단계 깊게 두고, 상하위 관계가 없는 이슈는 개수만 센다", () => {
  const hierarchy = issueHierarchy([
    issue("task", { parent: "feature" }),
    issue("alone"),
    issue("feature", { parent: "epic", issueType: "feature" }),
    issue("epic", { issueType: "epic" }),
  ]);

  expect(hierarchy.rows.map((row) => [row.issue.id, row.depth])).toEqual([
    ["epic", 0],
    ["feature", 1],
    ["task", 2],
  ]);
  expect(hierarchy.edges).toEqual([
    { from: "epic", to: "feature" },
    { from: "feature", to: "task" },
  ]);
  expect(hierarchy.unrelated).toBe(1);
});

test("형제 이슈는 우선순위와 만든 시각 순으로 둔다", () => {
  expect(
    rows([
      issue("late", { parent: "epic", createdAt: 2 }),
      issue("urgent", { parent: "epic", priority: 0, createdAt: 3 }),
      issue("early", { parent: "epic", createdAt: 1 }),
      issue("epic"),
    ]),
  ).toEqual([
    ["epic", 0],
    ["urgent", 1],
    ["early", 1],
    ["late", 1],
  ]);
});

test("상위 이슈가 필터로 빠진 이슈는 하위 이슈가 있으면 맨 왼쪽에 두고, 없으면 개수만 센다", () => {
  const hierarchy = issueHierarchy([
    issue("feature", { parent: "filtered-epic" }),
    issue("task", { parent: "feature" }),
    issue("orphan", { parent: "filtered-epic" }),
  ]);

  expect(hierarchy.rows.map((row) => [row.issue.id, row.depth])).toEqual([
    ["feature", 0],
    ["task", 1],
  ]);
  expect(hierarchy.unrelated).toBe(1);
});

test("상위 관계가 순환하면 앞선 이슈를 맨 왼쪽에 두고, 그 이슈로 되돌아오는 관계는 그리지 않는다", () => {
  const hierarchy = issueHierarchy([issue("a", { parent: "b" }), issue("b", { parent: "a" })]);

  expect(hierarchy.rows.map((row) => [row.issue.id, row.depth])).toEqual([
    ["a", 0],
    ["b", 1],
  ]);
  expect(hierarchy.edges).toEqual([{ from: "a", to: "b" }]);
});
