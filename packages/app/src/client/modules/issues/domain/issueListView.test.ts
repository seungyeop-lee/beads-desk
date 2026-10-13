import type { Issue } from "@beads-desk/bd/issue";
import { describe, expect, test } from "vitest";
import type { IssueListFilter } from "@/shared/contract/issueList";
import { toggleStatusFilter, visibleIssues } from "./issueListView";

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
const noRefinement = { types: [], search: "" };

describe("toggleStatusFilter", () => {
  test("상태를 고르면 선택에 더하고 다시 고르면 뺀다", () => {
    const added = toggleStatusFilter({ kind: "status", statuses: ["open"] }, "closed");
    expect(added).toEqual({ kind: "status", statuses: ["open", "closed"] });
    expect(toggleStatusFilter(added, "open")).toEqual({ kind: "status", statuses: ["closed"] });
  });

  test("ready를 고르면 다른 상태 선택을 모두 대신한다", () => {
    expect(toggleStatusFilter({ kind: "status", statuses: ["open"] }, "ready")).toEqual({
      kind: "ready",
    });
  });

  test("ready를 다시 고르면 모든 상태로 돌아간다", () => {
    expect(toggleStatusFilter({ kind: "ready" }, "ready")).toEqual({
      kind: "status",
      statuses: [],
    });
  });

  test("ready가 선택된 상태에서 다른 상태를 고르면 그 상태만 남긴다", () => {
    expect(toggleStatusFilter({ kind: "ready" }, "blocked")).toEqual({
      kind: "status",
      statuses: ["blocked"],
    });
  });
});

describe("visibleIssues", () => {
  test("상태 순서대로 묶고, 묶음 안에서는 우선순위와 생성 시각 순으로 정렬한다", () => {
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

    expect(ids(visibleIssues(issues, { kind: "status", statuses: [] }, noRefinement))).toEqual([
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

  test("ready 목록은 상태로 묶지 않고 우선순위 순으로만 정렬한다", () => {
    const issues = [
      issue("open-p2", { priority: 2 }),
      issue("progress-p1", { status: "in_progress", priority: 1 }),
    ];

    expect(ids(visibleIssues(issues, { kind: "ready" }, noRefinement))).toEqual([
      "progress-p1",
      "open-p2",
    ]);
  });

  test("유형과 검색어(id·제목, 대소문자 무시)로 거른다", () => {
    const issues = [
      issue("demo-1", { title: "Login bug", issueType: "bug" }),
      issue("demo-2", { title: "Logout", issueType: "task" }),
      issue("demo-3", { title: "Signup", issueType: "bug" }),
    ];
    const filter: IssueListFilter = { kind: "status", statuses: [] };

    expect(ids(visibleIssues(issues, filter, { types: ["bug"], search: "" }))).toEqual([
      "demo-1",
      "demo-3",
    ]);
    expect(ids(visibleIssues(issues, filter, { types: [], search: "LOG" }))).toEqual([
      "demo-1",
      "demo-2",
    ]);
    expect(ids(visibleIssues(issues, filter, { types: [], search: "demo-3" }))).toEqual(["demo-3"]);
  });
});
