import { describe, expect, test } from "vitest";
import {
  DEFAULT_TYPES,
  issueListHref,
  issueViewHref,
  readIssueListAddress,
} from "./issueListAddress";

const read = (href: string) => readIssueListAddress(new URL(href, "http://localhost").searchParams);

describe("issueListHref", () => {
  test("조건이 없으면 전체 보기 주소이고, 기본값인 조건은 주소에 넣지 않는다", () => {
    expect(issueListHref({})).toBe("/issues");
    expect(
      issueListHref({
        dates: { field: "created", from: null, to: null },
        types: [...DEFAULT_TYPES].reverse(),
      }),
    ).toBe("/issues");
    expect(issueViewHref("ready")).toBe("/issues?view=ready");
  });

  test("보기 탭, 날짜, 유형 조건을 함께 담고, 주소에서 그대로 다시 읽는다", () => {
    const address = {
      view: "closed",
      dates: { field: "closed", from: "2026-10-14", to: "2026-10-15" },
      types: ["bug", "task"],
    } as const;
    const href = issueListHref(address);

    expect(href).toBe(
      "/issues?view=closed&date=closed&from=2026-10-14&to=2026-10-15&type=bug&type=task",
    );
    expect(read(href)).toEqual(address);
  });

  test("날짜 없이 고른 기준도 주소에 남긴다", () => {
    const href = issueListHref({ dates: { field: "closed", from: null, to: null } });

    expect(read(href).dates).toEqual({ field: "closed", from: null, to: null });
  });
});

describe("readIssueListAddress", () => {
  test("유형 조건이 없으면 결정만 뺀 기본 선택이고, 비어 있으면 모든 유형을 보는 빈 선택이다", () => {
    expect(read("/issues").types).toEqual(DEFAULT_TYPES);
    expect(DEFAULT_TYPES).not.toContain("decision");
    expect(read(issueListHref({ types: [] })).types).toEqual([]);
  });
});
