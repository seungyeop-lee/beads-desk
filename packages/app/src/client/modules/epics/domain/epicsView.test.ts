import type { Issue } from "@beads-desk/bd/issue";
import { describe, expect, test } from "vitest";
import type { EpicSummary } from "@/shared/contract/epics";
import { issue } from "@/shared/domain/issues/issueFixture";
import {
  epicDescendantRows,
  notChildCandidate,
  settleExpandedEpics,
  sortEpics,
  topLevelEpics,
} from "./epicsView";

function summary(id: string, status: string, priority = 2, createdAt = 0): EpicSummary {
  return { epic: issue(id, { status, priority, createdAt }), totalChildren: 0, closedChildren: 0 };
}

test("상위 이슈가 에픽인 에픽은 상위 에픽이 닫혀 있어도 카드에서 빼고, 상위가 없거나 에픽이 아닌 에픽은 남긴다", () => {
  const epic = (id: string, parent: string | null, status = "open"): EpicSummary => ({
    epic: issue(id, { issueType: "epic", parent, status }),
    totalChildren: 0,
    closedChildren: 0,
  });

  const cards = topLevelEpics([
    epic("root", null),
    epic("root.1", "root"),
    epic("done", null, "closed"),
    epic("done.1", "done"),
    epic("task.1", "task"),
  ]);

  expect(cards.map(({ epic }) => epic.id)).toEqual(["root", "done", "task.1"]);
});

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

test("에픽에 하위로 넣을 후보에서 에픽 자신과 이미 그 에픽에 속한 후손 이슈를 빼고, 다른 에픽과 결정은 남긴다", () => {
  const excluded = notChildCandidate("epic", [
    issue("parent", { parent: "epic" }),
    issue("task", { parent: "parent" }),
  ]);

  expect(excluded(issue("epic", { issueType: "epic" }))).toBe(true);
  expect(excluded(issue("parent"))).toBe(true);
  expect(excluded(issue("task"))).toBe(true);
  expect(excluded(issue("other-epic", { issueType: "epic" }))).toBe(false);
  expect(excluded(issue("decision", { issueType: "decision" }))).toBe(false);
  expect(excluded(issue("other"))).toBe(false);
});

test("에픽의 후손 이슈는 상태와 우선순위와 관계없이 형제끼리 ID 오름차순으로 두고, 하위 이슈를 상위 이슈 바로 아래에 한 단계 깊게 둔다", () => {
  const row = (id: string, status: string, parent: string, fields: Partial<Issue> = {}) =>
    issue(id, { status, parent, ...fields });

  const rows = epicDescendantRows([
    row("x.10", "open", "x", { priority: 0 }),
    row("x.2", "closed", "x", { closedAt: 5 }),
    row("x.1.2", "open", "x.1", { priority: 0 }),
    row("x.1", "in_progress", "x", { priority: 4 }),
    row("x.2.1", "blocked", "x.2"),
    row("x.1.1", "closed", "x.1", { closedAt: 9 }),
  ]);

  expect(rows.map((row) => [row.issue.id, row.depth])).toEqual([
    ["x.1", 0],
    ["x.1.1", 1],
    ["x.1.2", 1],
    ["x.2", 0],
    ["x.2.1", 1],
    ["x.10", 0],
  ]);
});
