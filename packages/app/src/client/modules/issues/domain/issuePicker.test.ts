import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { epicsFirst, PICKER_LIMIT, pickerCandidates } from "./issuePicker";

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

test("검색어가 없으면 닫히지 않은 이슈를 최근에 고친 순서로 보인다", () => {
  const issues = [
    issue("old", { updatedAt: 1 }),
    issue("closed", { status: "closed", updatedAt: 3 }),
    issue("new", { updatedAt: 2 }),
  ];

  expect(ids(pickerCandidates(issues, " "))).toEqual(["new", "old"]);
});

test("검색어가 있으면 id나 제목에 든 이슈를 닫힌 이슈까지 대소문자 없이 찾는다", () => {
  const issues = [
    issue("demo-1", { title: "Login 화면" }),
    issue("demo-2", { title: "로그아웃", status: "closed" }),
    issue("demo-3", { title: "설정" }),
  ];

  expect(ids(pickerCandidates(issues, "login"))).toEqual(["demo-1"]);
  expect(ids(pickerCandidates(issues, "로그"))).toEqual(["demo-2"]);
  expect(ids(pickerCandidates(issues, "DEMO-3"))).toEqual(["demo-3"]);
});

test("뺄 이슈는 후보에 넣지 않고, 후보 수를 제한한다", () => {
  const issues = Array.from({ length: PICKER_LIMIT + 2 }, (_, index) => issue(`demo-${index}`));

  const candidates = pickerCandidates(issues, "", { exclude: (it) => it.id === "demo-0" });

  expect(candidates).toHaveLength(PICKER_LIMIT);
  expect(ids(candidates)).not.toContain("demo-0");
});

test("epicsFirst는 에픽을 먼저 두고, 그 안에서는 최근에 고친 순서로 둔다", () => {
  const issues = [
    issue("task-new", { updatedAt: 3 }),
    issue("epic-old", { issueType: "epic", updatedAt: 1 }),
    issue("epic-new", { issueType: "epic", updatedAt: 2 }),
  ];

  expect(ids(pickerCandidates(issues, "", { rank: epicsFirst }))).toEqual([
    "epic-new",
    "epic-old",
    "task-new",
  ]);
});
