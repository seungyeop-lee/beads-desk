import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import type { BoardItem } from "@/shared/contract/board";
import { boardColumns } from "./boardView";

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
    ],
    "7d",
    now,
  );

  expect(columns.ready.map((issue) => issue.id)).toEqual(["b", "c", "a"]);
  expect(columns.blocked.map((issue) => issue.id)).toEqual(["d"]);
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
