import { expect, test } from "vitest";
import type { EpicSummary } from "@/shared/contract/epics";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { groupEpics } from "./epicGroups";

function summary(id: string, status: string): EpicSummary {
  return { epic: issue(id, { status, issueType: "epic" }), totalChildren: 0, closedChildren: 0 };
}

function groupIds(epics: EpicSummary[]) {
  return groupEpics(epics).map(({ kind, epics }) => [kind, epics.map(({ epic }) => epic.id)]);
}

test("닫히지 않은 모든 상태의 에픽은 열린 묶음에, 닫힌 에픽은 닫힌 묶음에 받은 순서대로 넣는다", () => {
  expect(
    groupIds([
      summary("doing", "in_progress"),
      summary("open", "open"),
      summary("done-b", "closed"),
      summary("blocked", "blocked"),
      summary("deferred", "deferred"),
      summary("done-a", "closed"),
    ]),
  ).toEqual([
    ["open", ["doing", "open", "blocked", "deferred"]],
    ["closed", ["done-b", "done-a"]],
  ]);
});

test("에픽이 없는 묶음은 빼고, 에픽이 하나도 없으면 묶음도 없다", () => {
  expect(groupIds([summary("open", "open")])).toEqual([["open", ["open"]]]);
  expect(groupIds([summary("done", "closed")])).toEqual([["closed", ["done"]]]);
  expect(groupEpics([])).toEqual([]);
});
