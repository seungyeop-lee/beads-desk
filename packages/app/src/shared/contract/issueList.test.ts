import { expect, test } from "vitest";
import { issueListSearchParams, parseIssueListFilter, type IssueListFilter } from "./issueList";

test.each<IssueListFilter>([
  { kind: "ready" },
  { kind: "status", statuses: ["open", "in_progress"] },
  { kind: "status", statuses: [] },
])("조회 조건을 query로 바꿨다가 그대로 되돌린다: %o", (filter) => {
  expect(parseIssueListFilter(issueListSearchParams(filter))).toEqual(filter);
});

test.each(["bogus", "ready,open", "open,,closed"])(
  "올바르지 않은 상태 query는 거부한다: %s",
  (status) => {
    expect(parseIssueListFilter(new URLSearchParams({ status }))).toBeNull();
  },
);
