import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { focusView } from "./focusView";

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
    deferUntil: null,
    ...fields,
  };
}

const ids = (issues: Issue[]) => issues.map(({ id }) => id);

test("진행 중, 바로 작업 가능, 막힘으로 나누고 결정은 뺀다", () => {
  const view = focusView(
    [
      issue("doing", { status: "in_progress" }),
      issue("ready-p3", { ready: true, priority: 3 }),
      issue("ready-p1", { ready: true, priority: 1 }),
      issue("waiting", { blockedBy: ["ready-p1"] }),
      issue("decision", { issueType: "decision", status: "in_progress" }),
      issue("epic", { issueType: "epic", status: "in_progress" }),
      issue("done", { status: "closed" }),
    ],
    [],
  );

  expect(ids(view.inProgress)).toEqual(["doing"]);
  expect(ids(view.ready)).toEqual(["ready-p1", "ready-p3"]);
  expect(ids(view.blocked)).toEqual(["waiting"]);
});

test("에픽 진행률에는 닫히지 않은 epic만 진행 중인 것부터 보인다", () => {
  const summary = (id: string, status: string) => ({
    epic: issue(id, { issueType: "epic", status }),
    totalChildren: 2,
    closedChildren: 1,
  });

  const view = focusView(
    [],
    [summary("open", "open"), summary("done", "closed"), summary("doing", "in_progress")],
  );

  expect(view.openEpics.map(({ epic }) => epic.id)).toEqual(["doing", "open"]);
});

test("판단 기다림에는 유형과 작업 상태에 상관없이 human 라벨이 붙은 닫히지 않은 이슈를 모은다", () => {
  const view = focusView(
    [
      issue("question", { labels: ["human"], ready: true }),
      issue("decision", { issueType: "decision", labels: ["human"] }),
      issue("answered", { status: "closed", labels: ["human"] }),
      issue("plain", { ready: true }),
    ],
    [],
  );

  expect(ids(view.awaitingHuman)).toEqual(["question", "decision"]);
});
