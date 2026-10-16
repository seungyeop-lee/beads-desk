import type { Issue } from "@beads-desk/bd/issue";
import { describe, expect, test } from "vitest";
import type { EpicSummary } from "@/shared/contract/epics";
import { epicDescendantRows, notChildCandidate, settleExpandedEpics, sortEpics } from "./epicsView";

function summary(id: string, status: string, priority = 2, createdAt = 0): EpicSummary {
  return {
    epic: { id, status, priority, createdAt } as Issue,
    totalChildren: 0,
    closedChildren: 0,
  };
}

test("진행 중, 열림, 닫힘 순으로 묶고 묶음 안에서는 우선순위와 만든 시각 순으로 정렬한다", () => {
  const sorted = sortEpics([
    summary("closed", "closed", 0),
    summary("open-low", "open", 3),
    summary("open-high-late", "open", 1, 2),
    summary("open-high", "open", 1, 1),
    summary("doing", "in_progress", 4),
  ]);

  expect(sorted.map(({ epic }) => epic.id)).toEqual([
    "doing",
    "open-high",
    "open-high-late",
    "open-low",
    "closed",
  ]);
});

describe("settleExpandedEpics", () => {
  const epics = [summary("a", "open"), summary("b", "open")];

  test("처음 받으면 맨 위 epic만 펼치고, 받기 전이나 epic이 없으면 기다린다", () => {
    expect(settleExpandedEpics(epics, null)).toEqual(new Set(["a"]));
    expect(settleExpandedEpics([], null)).toBeNull();
  });

  test("닫힌 epic은 펼치지 않고, 닫히지 않은 epic 가운데 맨 위 epic만 펼친다", () => {
    const closed = [summary("done-a", "closed"), summary("done-b", "closed")];

    expect(settleExpandedEpics([...closed, summary("deferred", "deferred")], null)).toEqual(
      new Set(["deferred"]),
    );
    expect(settleExpandedEpics(closed, null)).toBeNull();
    expect(settleExpandedEpics(closed, new Set(["other-workspace"]))?.has("done-a")).toBe(false);
  });

  test("순서가 바뀌어도 사용자가 펼치거나 모두 접은 상태를 그대로 둔다", () => {
    const expanded = new Set(["a"]);
    const collapsed = new Set<string>();

    expect(settleExpandedEpics([...epics].reverse(), expanded)).toBe(expanded);
    expect(settleExpandedEpics(epics, collapsed)).toBe(collapsed);
  });

  test("펼쳐 둔 epic이 모두 목록에서 사라지면 다시 맨 위 epic만 펼친다", () => {
    expect(settleExpandedEpics(epics, new Set(["other-workspace"]))).toEqual(new Set(["a"]));
  });
});

test("에픽에 하위로 넣을 후보에서 에픽, 결정, 이미 그 에픽에 속한 후손 이슈를 모두 뺀다", () => {
  const excluded = notChildCandidate([
    { id: "feature", parent: "epic" } as Issue,
    { id: "task", parent: "feature" } as Issue,
  ]);

  expect(excluded({ id: "other-epic", issueType: "epic" } as Issue)).toBe(true);
  expect(excluded({ id: "decision", issueType: "decision" } as Issue)).toBe(true);
  expect(excluded({ id: "feature", issueType: "feature" } as Issue)).toBe(true);
  expect(excluded({ id: "task", issueType: "task" } as Issue)).toBe(true);
  expect(excluded({ id: "other", issueType: "task" } as Issue)).toBe(false);
});

test("에픽의 후손 이슈는 상태 순으로 정렬하되, 상태가 달라도 하위 이슈를 상위 이슈 바로 아래에 한 단계 깊게 둔다", () => {
  const row = (id: string, status: string, parent: string, fields: Partial<Issue> = {}) =>
    ({ id, status, parent, priority: 2, createdAt: 0, closedAt: null, ...fields }) as Issue;

  const rows = epicDescendantRows([
    row("feature-b", "open", "epic", { createdAt: 2 }),
    row("task-a-done", "closed", "feature-a", { closedAt: 5 }),
    row("feature-a", "open", "epic", { createdAt: 1 }),
    row("task-a-doing", "in_progress", "feature-a"),
    row("task-b", "open", "feature-b"),
    row("task-loose", "open", "epic", { createdAt: 3 }),
  ]);

  expect(rows.map((row) => [row.issue.id, row.depth])).toEqual([
    ["feature-a", 0],
    ["task-a-doing", 1],
    ["task-a-done", 1],
    ["feature-b", 0],
    ["task-b", 1],
    ["task-loose", 0],
  ]);
});
