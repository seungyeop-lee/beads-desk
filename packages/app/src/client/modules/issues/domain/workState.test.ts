import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { groupByWorkState, parseViewState, workState } from "./workState";

function issue(fields: Partial<Issue> = {}): Issue {
  return {
    id: "demo-1",
    title: "demo",
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

test("열린 이슈는 bd ready에 있으면 ready이고, 없으면 other이다", () => {
  expect(workState(issue({ ready: true }))).toBe("ready");
  expect(workState(issue())).toBe("other");
});

test("의존 관계 때문에 막힌 이슈는 저장 상태가 열림이나 진행 중이어도 blocked이다", () => {
  expect(workState(issue({ blockedBy: ["demo-2"] }))).toBe("blocked");
  expect(workState(issue({ status: "in_progress", blockedBy: ["demo-2"] }))).toBe("blocked");
  expect(workState(issue({ status: "blocked" }))).toBe("blocked");
});

test("닫힌 이슈는 막고 있는 이슈가 남아 있어도 closed이다", () => {
  expect(workState(issue({ status: "closed", blockedBy: ["demo-2"] }))).toBe("closed");
});

test("epic과 decision은 진행 중이거나 bd ready에 있어도 other이다", () => {
  expect(workState(issue({ issueType: "epic", status: "in_progress" }))).toBe("other");
  expect(workState(issue({ issueType: "decision", ready: true }))).toBe("other");
  expect(workState(issue({ issueType: "epic", status: "closed" }))).toBe("closed");
});

test("진행 중과 보류는 저장 상태를 따르고, 알 수 없는 상태는 other이다", () => {
  expect(workState(issue({ status: "in_progress" }))).toBe("in_progress");
  expect(workState(issue({ status: "deferred" }))).toBe("deferred");
  expect(workState(issue({ status: "pinned" }))).toBe("other");
});

test("작업 상태로 묶어 진행 중, 바로 작업 가능, 막힘, 그 밖, 보류, 닫힘 순으로 돌려주고 빈 묶음은 뺀다", () => {
  const groups = groupByWorkState([
    issue({ id: "closed", status: "closed" }),
    issue({ id: "ready", ready: true }),
    issue({ id: "doing", status: "in_progress" }),
    issue({ id: "epic", issueType: "epic" }),
    issue({ id: "waiting", blockedBy: ["ready"] }),
  ]);

  expect(groups.map(({ state, issues }) => [state, issues.map(({ id }) => id)])).toEqual([
    ["in_progress", ["doing"]],
    ["ready", ["ready"]],
    ["blocked", ["waiting"]],
    ["other", ["epic"]],
    ["closed", ["closed"]],
  ]);
});

test("묶음 안에서 닫힘은 최근에 닫은 순, 나머지는 우선순위와 만든 시각 순이다", () => {
  const groups = groupByWorkState([
    issue({ id: "p2-late", ready: true, createdAt: 20 }),
    issue({ id: "p0", ready: true, priority: 0, createdAt: 30 }),
    issue({ id: "p2-early", ready: true, createdAt: 10 }),
    issue({ id: "closed-old", status: "closed", closedAt: 1 }),
    issue({ id: "closed-new", status: "closed", closedAt: 2 }),
  ]);

  expect(groups.map(({ issues }) => issues.map(({ id }) => id))).toEqual([
    ["p0", "p2-early", "p2-late"],
    ["closed-new", "closed-old"],
  ]);
});

test("주소의 view 값은 보기 탭의 작업 상태만 받고, 그 밖의 값은 전체 보기(null)로 읽는다", () => {
  expect(parseViewState("blocked")).toBe("blocked");
  expect(parseViewState("other")).toBeNull();
  expect(parseViewState("bogus")).toBeNull();
  expect(parseViewState(null)).toBeNull();
});
