import type { Issue } from "@beads-desk/bd/issue";
import { describe, expect, test } from "vitest";
import type { BoardItem } from "@/shared/contract/board";
import { boardColumns, DROP_STATUS, dropOutcome } from "./boardView";

const now = new Date(2026, 9, 13, 15, 0).getTime();
const hoursAgo = (hours: number) => now - hours * 3_600_000;

function item(column: BoardItem["column"], id: string, fields: Partial<Issue> = {}): BoardItem {
  return { column, issue: { id, priority: 2, createdAt: 0, closedAt: null, ...fields } as Issue };
}

test("열마다 우선순위, 만든 시각, id 순으로 정렬한다", () => {
  const columns = boardColumns(
    [
      item("ready", "c", { priority: 1, createdAt: 2 }),
      item("ready", "b", { priority: 1, createdAt: 1 }),
      item("ready", "a", { priority: 3 }),
      item("blocked", "d"),
      item("other", "f", { priority: 4 }),
      item("other", "e", { priority: 0 }),
    ],
    "7d",
    now,
  );

  expect(columns.ready.map((issue) => issue.id)).toEqual(["b", "c", "a"]);
  expect(columns.blocked.map((issue) => issue.id)).toEqual(["d"]);
  expect(columns.other.map((issue) => issue.id)).toEqual(["e", "f"]);
  expect(columns.in_progress).toEqual([]);
});

test("닫힌 열은 고른 기간 안에 닫은 이슈만 최근 것부터 보인다", () => {
  const items = [
    item("closed", "old", { closedAt: hoursAgo(24 * 4) }),
    item("closed", "yesterday", { closedAt: hoursAgo(20) }),
    item("closed", "morning", { closedAt: hoursAgo(5) }),
    item("closed", "unknown"),
  ];

  const ids = (window: "today" | "3d" | "7d") =>
    boardColumns(items, window, now).closed.map((issue) => issue.id);

  expect(ids("today")).toEqual(["morning"]);
  expect(ids("3d")).toEqual(["morning", "yesterday"]);
  expect(ids("7d")).toEqual(["morning", "yesterday", "old"]);
});

test("보류·기타 열에 놓으면 보류 상태로 바꾼다", () => {
  expect(DROP_STATUS.other).toBe("deferred");
});

describe("dropOutcome", () => {
  test("다른 열에 놓으면 그 열의 상태로 바꾼다", () => {
    expect(dropOutcome("ready", "in_progress", "open")).toEqual({
      kind: "change",
      status: "in_progress",
    });
  });

  test("같은 열에 놓으면 아무것도 하지 않는다", () => {
    expect(dropOutcome("ready", "ready", "open")).toEqual({ kind: "none" });
  });

  test("의존 관계로 막힌 이슈를 이미 그 상태인 열에 놓으면 바꾸지 않고 막힌 이유를 알린다", () => {
    expect(dropOutcome("blocked", "ready", "open")).toEqual({ kind: "blockedByDependencies" });
    expect(dropOutcome("blocked", "in_progress", "in_progress")).toEqual({
      kind: "blockedByDependencies",
    });
  });
});
