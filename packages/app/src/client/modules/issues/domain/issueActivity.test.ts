import type { IssueComment, IssueEvent } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { issueActivity } from "./issueActivity";

function event(id: string, type: string, at: number, fields: Partial<IssueEvent> = {}): IssueEvent {
  return {
    id,
    type,
    actor: "tester",
    createdAt: at,
    changes: [],
    dependency: null,
    label: null,
    text: null,
    ...fields,
  };
}

function comment(id: string, at: number): IssueComment {
  return { id, author: "tester", text: id, createdAt: at };
}

test("이벤트와 댓글을 오래된 것부터 합치고, 같은 시각의 이벤트는 bd가 돌려준 순서를 뒤집어 둔다", () => {
  // bd history는 최신 이벤트를 먼저 돌려줍니다.
  const events = [
    event("later", "updated", 2_000),
    event("same-2", "updated", 1_000),
    event("same-1", "updated", 1_000),
  ];

  const entries = issueActivity(events, [comment("c-1", 1_500)]);

  expect(entries.map((entry) => entry.key)).toEqual(["same-1", "same-2", "c-1", "later"]);
});

test("댓글은 이슈 상세의 댓글로 보이므로 commented 이벤트는 뺀다", () => {
  const entries = issueActivity(
    [event("e-1", "commented", 1, { text: "댓글" })],
    [comment("c-1", 1)],
  );

  expect(entries.map((entry) => entry.kind)).toEqual(["comment"]);
});

test("이벤트를 종류별 줄로 바꾼다", () => {
  const lines = (value: IssueEvent) => {
    const [entry] = issueActivity([value], []);
    return entry?.kind === "event" ? entry.lines : [];
  };
  const change = { field: "status", before: "open", after: "in_progress" };

  expect(lines(event("e", "created", 0))).toEqual([{ kind: "created" }]);
  expect(lines(event("e", "closed", 0, { text: "끝" }))).toEqual([
    { kind: "closed", reason: "끝" },
  ]);
  expect(lines(event("e", "claimed", 0, { changes: [change, change] }))).toEqual([
    { kind: "field", change },
    { kind: "field", change },
  ]);
  expect(
    lines(event("e", "dependency_added", 0, { dependency: { dependsOnId: "b", type: "blocks" } })),
  ).toEqual([{ kind: "dependencyAdded", dependsOnId: "b", dependencyType: "blocks" }]);
  expect(
    lines(event("e", "dependency_removed", 0, { dependency: { dependsOnId: "b", type: null } })),
  ).toEqual([{ kind: "dependencyRemoved", dependsOnId: "b" }]);
  expect(lines(event("e", "label_added", 0, { label: "ui" }))).toEqual([
    { kind: "labelAdded", label: "ui" },
  ]);
  expect(lines(event("e", "label_removed", 0, { label: "ui" }))).toEqual([
    { kind: "labelRemoved", label: "ui" },
  ]);
  expect(lines(event("e", "compacted", 0, { text: "level 1" }))).toEqual([
    { kind: "other", eventType: "compacted", text: "level 1" },
  ]);
});
