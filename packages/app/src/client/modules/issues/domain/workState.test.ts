import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { workState } from "./workState";

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
