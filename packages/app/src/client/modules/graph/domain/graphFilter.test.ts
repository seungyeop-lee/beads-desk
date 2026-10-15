import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { filterGraphIssues } from "./graphFilter";

function issue(id: string, fields: Partial<Issue> = {}): Issue {
  return { id, status: "open", issueType: "task", parent: null, ...fields } as Issue;
}

const issues = [
  issue("epic", { issueType: "epic" }),
  issue("feature", { issueType: "feature", parent: "epic" }),
  issue("task", { parent: "feature", status: "in_progress" }),
  issue("bug", { issueType: "bug", ready: true }),
  issue("decision", { issueType: "decision" }),
];
const ids = (filtered: Issue[]) => filtered.map((it) => it.id);
const all = { epic: null, types: [], states: [] };

test("상위 에픽을 고르면 그 에픽의 후손만 남기고 에픽 자신은 뺀다", () => {
  expect(ids(filterGraphIssues(issues, { ...all, epic: "epic" }))).toEqual(["feature", "task"]);
});

test("상위 관계가 순환해도 멈춘다", () => {
  const looped = [issue("x", { parent: "y" }), issue("y", { parent: "x" })];

  expect(ids(filterGraphIssues(looped, { ...all, epic: "x" }))).toEqual(["y"]);
});

test("유형과 작업 상태는 고른 것만 남기고, 고른 것이 없으면 모두 남긴다", () => {
  expect(ids(filterGraphIssues(issues, all))).toEqual(ids(issues));
  expect(ids(filterGraphIssues(issues, { ...all, types: ["bug", "task"] }))).toEqual([
    "task",
    "bug",
  ]);
  expect(ids(filterGraphIssues(issues, { ...all, states: ["in_progress", "ready"] }))).toEqual([
    "task",
    "bug",
  ]);
});
