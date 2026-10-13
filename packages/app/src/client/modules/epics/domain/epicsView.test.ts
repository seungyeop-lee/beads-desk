import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import type { EpicSummary } from "@/shared/contract/epics";
import { sortEpics } from "./epicsView";

function summary(id: string, status: string, priority = 2, createdAt = 0): EpicSummary {
  return {
    epic: { id, status, priority, createdAt } as Issue,
    totalChildren: 0,
    closedChildren: 0,
    eligibleForClose: false,
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
