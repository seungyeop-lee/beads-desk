import type { Issue } from "@beads-desk/bd/issue";
import { describe, expect, test } from "vitest";
import type { EpicSummary } from "@/shared/contract/epics";
import { issue } from "@/shared/domain/issues/issueFixture";
import {
  childProgress,
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

describe("sortEpics", () => {
  const ids = (epics: EpicSummary[]) => sortEpics(epics).map(({ epic }) => epic.id);

  test("진행 중, 열림, 닫힘 순으로 묶는다", () => {
    expect(
      ids([
        summary("closed", "closed", 0),
        summary("open", "open", 1),
        summary("doing", "in_progress", 4),
      ]),
    ).toEqual(["doing", "open", "closed"]);
  });

  test("상태와 우선순위가 같으면 최근에 만든 에픽을 앞에 둔다", () => {
    expect(ids([summary("old", "open", 2, 1), summary("new", "open", 2, 2)])).toEqual([
      "new",
      "old",
    ]);
  });

  test("우선순위가 다르면 만든 시각보다 우선순위를 먼저 비교한다", () => {
    expect(ids([summary("low-new", "open", 3, 9), summary("high-old", "open", 1, 1)])).toEqual([
      "high-old",
      "low-new",
    ]);
  });

  test("닫힌 에픽은 우선순위와 만든 시각에 관계없이 최근에 닫은 에픽을 앞에 둔다", () => {
    const closed = (id: string, priority: number, createdAt: number, closedAt: number) => ({
      epic: issue(id, { status: "closed", priority, createdAt, closedAt }),
      totalChildren: 0,
      closedChildren: 0,
    });

    expect(ids([closed("early", 0, 9, 1), closed("late", 4, 1, 2)])).toEqual(["late", "early"]);
  });
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

test("후손 이슈마다 직접 하위 이슈만 세어 닫힌 수와 전체 수를 내고, 하위 이슈가 없는 이슈는 담지 않는다", () => {
  const progress = childProgress([
    issue("a.1", { issueType: "epic", parent: "a" }),
    issue("a.1.1", { parent: "a.1", status: "closed" }),
    issue("a.1.2", { parent: "a.1" }),
    issue("a.1.3", { parent: "a.1", status: "in_progress" }),
    issue("a.1.1.1", { parent: "a.1.1", status: "closed" }),
  ]);

  expect(progress.get("a.1")).toEqual({ closed: 1, total: 3 });
  expect(progress.get("a.1.1")).toEqual({ closed: 1, total: 1 });
  expect(progress.has("a.1.2")).toBe(false);
});
