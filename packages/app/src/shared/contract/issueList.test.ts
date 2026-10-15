import { expect, test } from "vitest";
import {
  descriptionSearchPath,
  issueListSearchParams,
  parseDescriptionSearch,
  parseIssueListFilter,
  type IssueListFilter,
} from "./issueList";

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

test("설명 검색어를 query로 바꿨다가 그대로 되돌린다", () => {
  const path = descriptionSearchPath("세션 토큰 & 만료");

  expect(path.startsWith("/api/issue-search?")).toBe(true);
  expect(parseDescriptionSearch(new URL(path, "http://localhost").searchParams)).toBe(
    "세션 토큰 & 만료",
  );
});

test.each(["", "?description=", "?description=%20%20"])(
  "설명 검색어가 없거나 공백뿐이면 거부한다: %s",
  (query) => {
    expect(parseDescriptionSearch(new URLSearchParams(query))).toBeNull();
  },
);
