import type { Issue } from "@beads-desk/bd/issue";
import { describe, expect, test } from "vitest";
import { byStatusGroup, refineIssues } from "./issueListView";

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
