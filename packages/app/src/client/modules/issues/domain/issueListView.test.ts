import type { Issue } from "@beads-desk/bd/issue";
import { describe, expect, test } from "vitest";
import {
  byClosedDesc,
  byPriorityThenCreated,
  byStatusGroup,
  issueTree,
  nestUnderParents,
  refineIssues,
  visibleTreeRows,
} from "./issueListView";

function issue(id: string, fields: Partial<Issue> = {}): Issue {
  return {
    id,
    title: id,
    status: "open",
    priority: 2,
    issueType: "task",
    assignee: null,
    labels: [],
    parent: null,
    dependencyCount: 0,
    dependentCount: 0,
    createdAt: 0,
    updatedAt: 0,
    startedAt: null,
    closedAt: null,
    ...fields,
  };
}

const ids = (issues: Issue[]) => issues.map((it) => it.id);

describe("byStatusGroup", () => {
  test("상태 순서대로 묶고, 묶음 안에서는 우선순위와 생성 시각 순, 닫힘은 최근에 닫은 순으로 정렬한다", () => {
    const issues = [
      issue("closed-old", { status: "closed", closedAt: 1 }),
      issue("blocked", { status: "blocked" }),
      issue("open-p2-late", { createdAt: 20 }),
      issue("progress", { status: "in_progress" }),
      issue("open-p2-early", { createdAt: 10 }),
      issue("closed-new", { status: "closed", closedAt: 2 }),
      issue("open-p0", { priority: 0, createdAt: 30 }),
      issue("deferred", { status: "deferred" }),
    ];

    expect(ids(issues.sort(byStatusGroup))).toEqual([
      "open-p0",
      "open-p2-early",
      "open-p2-late",
      "progress",
      "blocked",
      "deferred",
      "closed-new",
      "closed-old",
    ]);
  });
});

describe("byPriorityThenCreated", () => {
  test("우선순위와 만든 시각이 같으면 id의 숫자 부분을 숫자로 비교한다", () => {
    const issues = [issue("demo-x.10"), issue("demo-x.2"), issue("demo-x.1")];

    expect(ids(issues.sort(byPriorityThenCreated))).toEqual(["demo-x.1", "demo-x.2", "demo-x.10"]);
  });
});

describe("nestUnderParents", () => {
  test("하위 이슈를 상위 이슈 바로 아래로 옮기고, 하위끼리와 손자 이슈도 정렬한 순서를 따른다", () => {
    const sorted = [
      issue("feature-a", { createdAt: 1 }),
      issue("feature-b", { createdAt: 2 }),
      issue("task-b1", { parent: "feature-b", priority: 0, createdAt: 3 }),
      issue("task-a2", { parent: "feature-a", createdAt: 4 }),
      issue("task-a1-sub", { parent: "task-a1", createdAt: 5 }),
      issue("task-a1", { parent: "feature-a", createdAt: 6 }),
    ];

    expect(ids(nestUnderParents(sorted))).toEqual([
      "feature-a",
      "task-a2",
      "task-a1",
      "task-a1-sub",
      "feature-b",
      "task-b1",
    ]);
  });

  test("상위 이슈가 목록에 없는 하위 이슈는 정렬한 자리에 둔다", () => {
    const sorted = [
      issue("orphan-early", { parent: "elsewhere" }),
      issue("feature"),
      issue("orphan-late", { parent: "elsewhere" }),
    ];

    expect(ids(nestUnderParents(sorted))).toEqual(["orphan-early", "feature", "orphan-late"]);
  });

  test("닫힘처럼 최근에 닫은 순으로 정렬한 목록도 상위 아래에서 그 순서를 지킨다", () => {
    const sorted = [
      issue("task-new", { status: "closed", parent: "feature", closedAt: 30 }),
      issue("feature", { status: "closed", closedAt: 20 }),
      issue("task-old", { status: "closed", parent: "feature", closedAt: 10 }),
    ].sort(byClosedDesc);

    expect(ids(nestUnderParents(sorted))).toEqual(["feature", "task-new", "task-old"]);
  });

  test("상위 관계가 순환해도 모든 이슈를 한 번씩 돌려준다", () => {
    const sorted = [issue("a", { parent: "b" }), issue("b", { parent: "a" }), issue("c")];

    expect(ids(nestUnderParents(sorted))).toEqual(["c", "a", "b"]);
  });
});

describe("issueTree", () => {
  const tree = (rows: ReturnType<typeof issueTree>) =>
    rows.map(({ issue, depth, childCount }) => [issue.id, depth, childCount]);

  test("상위가 목록에 없는 행은 깊이 0이고, 하위는 한 단계마다 깊이가 1씩 늘며, 바로 아래 하위 행만 센다", () => {
    const sorted = [
      issue("feature", { parent: "epic" }),
      issue("task", { parent: "feature" }),
      issue("sub", { parent: "task" }),
      issue("task-2", { parent: "feature" }),
      issue("loose", { parent: "epic" }),
    ];

    expect(tree(issueTree(sorted))).toEqual([
      ["feature", 0, 2],
      ["task", 1, 1],
      ["sub", 2, 0],
      ["task-2", 1, 0],
      ["loose", 0, 0],
    ]);
  });

  test("상위 관계가 순환해도 모든 행을 한 번씩 놓고, 이미 놓인 행은 하위로 세지 않는다", () => {
    const sorted = [issue("a", { parent: "b" }), issue("b", { parent: "a" }), issue("c")];

    expect(tree(issueTree(sorted))).toEqual([
      ["c", 0, 0],
      ["a", 0, 1],
      ["b", 1, 0],
    ]);
  });
});

describe("visibleTreeRows", () => {
  const rows = issueTree([
    issue("feature"),
    issue("task", { parent: "feature" }),
    issue("sub", { parent: "task" }),
    issue("loose"),
  ]);
  const visible = (expanded: string[]) =>
    visibleTreeRows(rows, new Set(expanded)).map((row) => row.issue.id);

  test("접은 행 아래의 후손 행은 모두 숨기고, 접은 행 다음의 같은 깊이 행부터 다시 보인다", () => {
    expect(visible([])).toEqual(["feature", "loose"]);
    expect(visible(["task"])).toEqual(["feature", "loose"]);
  });

  test("펼친 행의 하위 행은 보이고, 그 하위 행을 접었으면 그 아래는 숨긴다", () => {
    expect(visible(["feature"])).toEqual(["feature", "task", "loose"]);
    expect(visible(["feature", "task"])).toEqual(["feature", "task", "sub", "loose"]);
  });
});

describe("refineIssues", () => {
  test("유형과 검색어(id·제목, 대소문자 무시)로 거른다", () => {
    const issues = [
      issue("demo-1", { title: "Login bug", issueType: "bug" }),
      issue("demo-2", { title: "Logout", issueType: "task" }),
      issue("demo-3", { title: "Signup", issueType: "bug" }),
    ];

    expect(ids(refineIssues(issues, { types: ["bug"], search: "" }))).toEqual(["demo-1", "demo-3"]);
    expect(ids(refineIssues(issues, { types: [], search: "LOG" }))).toEqual(["demo-1", "demo-2"]);
    expect(ids(refineIssues(issues, { types: [], search: "demo-3" }))).toEqual(["demo-3"]);
  });
});
