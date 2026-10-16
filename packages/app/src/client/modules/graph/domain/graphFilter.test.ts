import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { filterGraphIssues } from "./graphFilter";

function issue(id: string, fields: Partial<Issue> = {}): Issue {
  return { id, status: "open", issueType: "task", parent: null, labels: [], ...fields } as Issue;
}

const issues = [
  issue("outer", { issueType: "epic" }),
  issue("inner", { issueType: "epic", parent: "outer" }),
  issue("feature", { issueType: "feature", parent: "inner" }),
  issue("task", { parent: "feature", status: "in_progress" }),
  issue("bug", { issueType: "bug", ready: true }),
  issue("lone", { issueType: "epic" }),
];
const ancestorEpics = { inner: ["outer"], feature: ["inner", "outer"], task: ["inner", "outer"] };
const ids = (filtered: Issue[]) => filtered.map((it) => it.id);
const all = { epic: { kind: "all" }, types: [], states: [] } as const;
const filter = (changes: Partial<Parameters<typeof filterGraphIssues>[2]>) =>
  ids(filterGraphIssues(issues, ancestorEpics, { ...all, ...changes }));

test("에픽 소속 전체는 거르지 않는다", () => {
  expect(filter({})).toEqual(ids(issues));
});

test("개별 에픽을 고르면 그 에픽에 속한 후손만 남기고 에픽 자신은 뺀다", () => {
  expect(filter({ epic: { kind: "epic", id: "outer" } })).toEqual(["inner", "feature", "task"]);
  expect(filter({ epic: { kind: "epic", id: "inner" } })).toEqual(["feature", "task"]);
});

test("에픽에 속한 이슈는 어느 에픽이든 상위에 있는 이슈만 남긴다", () => {
  expect(filter({ epic: { kind: "inEpic" } })).toEqual(["inner", "feature", "task"]);
});

test("에픽에 속하지 않은 이슈는 상위에 에픽이 없는 이슈만 남기고, 에픽 자신은 뺀다", () => {
  expect(filter({ epic: { kind: "noEpic" } })).toEqual(["bug"]);
});

test("유형과 작업 상태는 고른 것만 남기고, 고른 것이 없으면 모두 남긴다", () => {
  expect(filter({ types: ["bug", "task"] })).toEqual(["task", "bug"]);
  expect(filter({ states: ["in_progress", "ready"] })).toEqual(["task", "bug"]);
});
