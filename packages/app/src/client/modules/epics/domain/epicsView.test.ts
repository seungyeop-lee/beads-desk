import type { Issue } from "@beads-desk/bd/issue";
import { describe, expect, test } from "vitest";
import type { EpicSummary } from "@/shared/contract/epics";
import { settleExpandedEpics, sortEpics } from "./epicsView";

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
