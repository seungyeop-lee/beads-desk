import type { Issue } from "@beads-desk/bd/issue";
import { describe, expect, test } from "vitest";
import {
  filterByDate,
  localDayOf,
  parseIssueDateFilter,
  type IssueDateFilter,
} from "./issueDateFilter";

function issue(id: string, fields: Partial<Issue> = {}): Issue {
  return {
    id,
    title: id,
    status: "open",
    priority: 2,
    issueType: "task",
    assignee: null,
    labels: [],
    parent: null,
    dependencyCount: 0,
    dependentCount: 0,
    createdAt: 0,
    updatedAt: 0,
    startedAt: null,
    closedAt: null,
    deferUntil: null,
    ...fields,
  };
}

const ids = (issues: Issue[]) => issues.map((it) => it.id);

// 현지 시각으로 만들어, 테스트를 실행하는 시간대와 관계없이 하루의 경계를 확인합니다.
const at = (day: number, hour = 0, minute = 0, ms = 0) =>
  new Date(2026, 9, day, hour, minute, 0, ms).getTime();

const created = (from: string | null, to: string | null): IssueDateFilter => ({
  field: "created",
  from,
  to,
});

describe("filterByDate", () => {
  test("시작일 자정부터 종료일이 끝날 때까지 만든 이슈를 남긴다", () => {
    const issues = [
      issue("before", { createdAt: at(13, 23, 59, 999) }),
      issue("start", { createdAt: at(14) }),
      issue("end", { createdAt: at(15, 23, 59, 999) }),
      issue("after", { createdAt: at(16) }),
    ];

    expect(ids(filterByDate(issues, created("2026-10-14", "2026-10-15")))).toEqual([
      "start",
      "end",
    ]);
  });

  test("시작일과 종료일이 같으면 그 하루만 남긴다", () => {
    const issues = [
      issue("yesterday", { createdAt: at(14, 12) }),
      issue("today", { createdAt: at(15, 12) }),
    ];

    expect(ids(filterByDate(issues, created("2026-10-15", "2026-10-15")))).toEqual(["today"]);
  });

  test("한쪽 날짜만 있으면 다른 쪽 끝은 열어 둔다", () => {
    const issues = [issue("old", { createdAt: at(1) }), issue("new", { createdAt: at(20) })];

    expect(ids(filterByDate(issues, created("2026-10-10", null)))).toEqual(["new"]);
    expect(ids(filterByDate(issues, created(null, "2026-10-10")))).toEqual(["old"]);
  });

  test("닫은 날 기준이면 닫은 시각으로 거르고, 닫히지 않은 이슈는 뺀다", () => {
    const issues = [
      issue("closed-in-range", { createdAt: at(1), status: "closed", closedAt: at(15, 9) }),
      issue("closed-earlier", { createdAt: at(15), status: "closed", closedAt: at(14, 9) }),
      issue("open", { createdAt: at(15) }),
    ];

    expect(
      ids(filterByDate(issues, { field: "closed", from: "2026-10-15", to: "2026-10-15" })),
    ).toEqual(["closed-in-range"]);
  });

  test("날짜가 하나도 없으면 기준과 관계없이 모든 이슈를 남긴다", () => {
    const issues = [issue("open"), issue("closed", { status: "closed", closedAt: at(1) })];

    expect(ids(filterByDate(issues, { field: "closed", from: null, to: null }))).toEqual([
      "open",
      "closed",
    ]);
  });
});

describe("parseIssueDateFilter", () => {
  test("기준과 YYYY-MM-DD 날짜를 읽는다", () => {
    expect(parseIssueDateFilter("closed", "2026-10-14", "2026-10-15")).toEqual({
      field: "closed",
      from: "2026-10-14",
      to: "2026-10-15",
    });
  });

  test("기준이 없거나 알 수 없으면 만든 날 기준이다", () => {
    expect(parseIssueDateFilter(null, null, null)).toEqual(created(null, null));
    expect(parseIssueDateFilter("updated", null, null)).toEqual(created(null, null));
  });

  test("형식이 다르거나 달력에 없는 날짜는 없는 것으로 본다", () => {
    expect(parseIssueDateFilter(null, "2026-2-1", "2026-02-30")).toEqual(created(null, null));
    expect(parseIssueDateFilter(null, "yesterday", "2026-10-15")).toEqual(
      created(null, "2026-10-15"),
    );
  });
});

describe("localDayOf", () => {
  test("filterByDate와 같은 경계로 시각이 속한 현지 날짜를 돌려준다", () => {
    const lastMoment = at(15) - 1;
    const day = localDayOf(lastMoment);

    expect(day).toBe("2026-10-14");
    expect(localDayOf(at(15))).toBe("2026-10-15");
    expect(filterByDate([issue("x", { createdAt: lastMoment })], created(day, day))).toHaveLength(
      1,
    );
  });
});
