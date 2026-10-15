import { describe, expect, test } from "vitest";
import { issueListHref, issueViewHref, readIssueListAddress } from "./issueListAddress";

const read = (href: string) => readIssueListAddress(new URL(href, "http://localhost").searchParams);

describe("issueListHref", () => {
  test("조건이 없으면 전체 보기 주소이고, 기본값인 조건은 주소에 넣지 않는다", () => {
    expect(issueListHref(null)).toBe("/issues");
    expect(issueListHref(null, { field: "created", from: null, to: null })).toBe("/issues");
    expect(issueViewHref("ready")).toBe("/issues?view=ready");
  });

  test("보기 탭과 날짜 조건을 함께 담고, 주소에서 그대로 다시 읽는다", () => {
    const dates = { field: "closed", from: "2026-10-14", to: "2026-10-15" } as const;
    const href = issueListHref("closed", dates);

    expect(href).toBe("/issues?view=closed&date=closed&from=2026-10-14&to=2026-10-15");
    expect(read(href)).toEqual({ view: "closed", dates });
  });

  test("날짜 없이 고른 기준도 주소에 남긴다", () => {
    const href = issueListHref(null, { field: "closed", from: null, to: null });

    expect(read(href).dates).toEqual({ field: "closed", from: null, to: null });
  });
});
