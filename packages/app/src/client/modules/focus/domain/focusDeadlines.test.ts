import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { focusDeadlines } from "./focusDeadlines";

const ids = (issues: Issue[]) => issues.map(({ id }) => id);

// 2026-10-30(목) 14:00, browser 현지 시각입니다.
const NOW = new Date(2026, 9, 30, 14, 0).getTime();
const TODAY_LATE = new Date(2026, 9, 30, 23, 30).getTime();
const FOURTH_DAY_START = new Date(2026, 10, 3).getTime();

test("고정한 현재 시각에서 기한 초과, 오늘 마감, 내일부터 3일 이내 마감으로 나누고, 마감일이 없거나 닫힌 이슈는 뺀다", () => {
  const deadlines = focusDeadlines(
    [
      issue("fourth-day-start", { dueAt: FOURTH_DAY_START }),
      issue("before-fourth-day", { dueAt: FOURTH_DAY_START - 1 }),
      issue("tomorrow-start", { dueAt: new Date(2026, 9, 31).getTime() }),
      issue("today-late", { dueAt: TODAY_LATE }),
      issue("today-start", { dueAt: new Date(2026, 9, 30).getTime() }),
      issue("hour-ago", { dueAt: NOW - 60 * 60 * 1000 }),
      issue("undated"),
      issue("closed", { status: "closed", dueAt: NOW - 1 }),
    ],
    NOW,
  );

  expect(ids(deadlines.overdue)).toEqual(["today-start", "hour-ago"]);
  expect(ids(deadlines.dueToday)).toEqual(["today-late"]);
  expect(ids(deadlines.dueSoon)).toEqual(["tomorrow-start", "before-fourth-day"]);
  expect(deadlines.today).toBe("2026-10-30");
  expect(deadlines.soon).toEqual({ from: "2026-10-31", to: "2026-11-02" });
});

test("마감이 지난 진행 중·막힘·보류 이슈는 작업 상태와 관계없이 기한 초과다", () => {
  const deadlines = focusDeadlines(
    [
      issue("doing", { status: "in_progress", dueAt: NOW - 1 }),
      issue("waiting", { status: "open", blockedBy: ["doing"], dueAt: NOW - 1 }),
      issue("blocked", { status: "blocked", dueAt: NOW - 1 }),
      issue("deferred", { status: "deferred", dueAt: NOW - 1 }),
    ],
    NOW,
  );

  expect(ids(deadlines.overdue)).toEqual(["doing", "waiting", "blocked", "deferred"]);
});

test("분류가 다음에 바뀌는 시각은 가장 이른 마감 시각을 넘는 순간과 다음 자정 중 이른 쪽이다", () => {
  const tomorrowStart = new Date(2026, 9, 31).getTime();

  expect(focusDeadlines([issue("today-late", { dueAt: TODAY_LATE })], NOW).nextChange).toBe(
    TODAY_LATE + 1,
  );
  expect(
    focusDeadlines(
      [
        issue("overdue", { dueAt: NOW - 1 }),
        issue("closed", { status: "closed", dueAt: NOW + 1 }),
        issue("next-week", { dueAt: tomorrowStart + 7 * 24 * 60 * 60 * 1000 }),
      ],
      NOW,
    ).nextChange,
  ).toBe(tomorrowStart);
});

test("마감 시각을 넘거나 자정을 지나면 같은 이슈의 분류가 바뀐다", () => {
  const issues = [
    issue("today-late", { dueAt: TODAY_LATE }),
    issue("tomorrow-noon", { dueAt: new Date(2026, 9, 31, 12, 0).getTime() }),
  ];
  const afterDue = focusDeadlines(issues, focusDeadlines(issues, NOW).nextChange);
  expect(ids(afterDue.overdue)).toEqual(["today-late"]);
  expect(ids(afterDue.dueSoon)).toEqual(["tomorrow-noon"]);

  const nextDay = focusDeadlines(issues, afterDue.nextChange);
  expect(nextDay.today).toBe("2026-10-31");
  expect(ids(nextDay.dueToday)).toEqual(["tomorrow-noon"]);
  expect(ids(nextDay.dueSoon)).toEqual([]);
});
