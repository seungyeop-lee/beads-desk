import { expect, test } from "vitest";
import { ISSUE_TYPES } from "./issueTypes";

test("bd의 기본 이슈 유형을 정한 순서로 한 번씩 담는다", () => {
  expect(ISSUE_TYPES).toEqual([
    "bug",
    "feature",
    "task",
    "epic",
    "chore",
    "decision",
    "spike",
    "story",
    "milestone",
  ]);
});
