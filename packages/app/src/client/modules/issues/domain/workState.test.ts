import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { groupByWorkState, issueListGroups, parseViewState, workState } from "./workState";

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
    startedAt: null,
    closedAt: null,
    deferUntil: null,
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

test("human 라벨이 붙은 열린 이슈는 bd ready에 있거나 진행 중이어도 awaiting_human이고, 닫힘, 막힘, 보류가 먼저다", () => {
  const human = { labels: ["human"] };
  expect(workState(issue({ ...human, ready: true }))).toBe("awaiting_human");
  expect(workState(issue({ ...human, status: "in_progress" }))).toBe("awaiting_human");
  expect(workState(issue({ ...human, issueType: "epic" }))).toBe("awaiting_human");
  expect(workState(issue({ ...human, status: "closed" }))).toBe("closed");
  expect(workState(issue({ ...human, blockedBy: ["demo-2"] }))).toBe("blocked");
  expect(workState(issue({ ...human, status: "deferred" }))).toBe("deferred");
});

test("작업 상태로 묶어 진행 중, 바로 작업 가능, 막힘, 판단 기다림, 그 밖, 보류, 닫힘 순으로 돌려주고 빈 묶음은 뺀다", () => {
  const groups = groupByWorkState([
    issue({ id: "closed", status: "closed" }),
    issue({ id: "ready", ready: true }),
    issue({ id: "doing", status: "in_progress" }),
    issue({ id: "epic", issueType: "epic" }),
    issue({ id: "waiting", blockedBy: ["ready"] }),
    issue({ id: "question", labels: ["human"], ready: true }),
  ]);

  expect(groups.map(({ state, issues }) => [state, issues.map(({ id }) => id)])).toEqual([
    ["in_progress", ["doing"]],
    ["ready", ["ready"]],
    ["blocked", ["waiting"]],
    ["awaiting_human", ["question"]],
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

test("이슈 목록의 묶음 안에서는 우선순위보다 상위 관계가 앞서, 하위 이슈가 상위 이슈 바로 아래에 온다", () => {
  const groups = issueListGroups([
    issue({ id: "feature", issueType: "feature", ready: true, priority: 2 }),
    issue({ id: "other", ready: true, priority: 1 }),
    issue({ id: "task", ready: true, priority: 0, parent: "feature" }),
  ]);

  expect(groups.map(({ state, issues }) => [state, issues.map(({ id }) => id)])).toEqual([
    ["ready", ["other", "feature", "task"]],
  ]);
});

test("이슈 목록에서 상위와 작업 상태가 다른 하위 이슈는 자기 묶음에 남는다", () => {
  const groups = issueListGroups([
    issue({ id: "feature", issueType: "feature", ready: true }),
    issue({ id: "doing", status: "in_progress", parent: "feature" }),
  ]);

  expect(groups.map(({ state, issues }) => [state, issues.map(({ id }) => id)])).toEqual([
    ["in_progress", ["doing"]],
    ["ready", ["feature"]],
  ]);
});

test("주소의 view 값은 보기 탭의 작업 상태만 받고, 그 밖의 값은 전체 보기(null)로 읽는다", () => {
  expect(parseViewState("blocked")).toBe("blocked");
  expect(parseViewState("other")).toBeNull();
  expect(parseViewState("bogus")).toBeNull();
  expect(parseViewState(null)).toBeNull();
});
