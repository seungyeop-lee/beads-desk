import { describe, expect, test } from "vitest";
import { acmeIssues, toImportRecord, type DemoIssue } from "./acmeProject.ts";

// 현지 시각으로 만들어, 테스트를 실행하는 시간대와 관계없이 하루의 경계를 확인합니다.
const at = (hour: number, minute: number) => new Date(2026, 9, 15, hour, minute).getTime();
const localDay = (time: number) => new Date(time).toDateString();
const WORKSPACE = "/tmp/acme-web";

describe.each([
  ["자정 직후", at(0, 5)],
  ["밤 늦게", at(23, 55)],
])("%s에 seed를 실행해도", (_, now) => {
  const issues = acmeIssues(now, WORKSPACE);

  test("모든 시각이 만든 시각부터 지금 사이에 차례대로 놓인다", () => {
    const outOfOrder = issues.filter(({ createdAt, startedAt, closedAt, comments = [] }) => {
      const times = [createdAt, startedAt ?? createdAt, closedAt ?? now, now];
      const ordered = times.every((time, index) => index === 0 || times[index - 1]! <= time);
      return !ordered || comments.some(({ at }) => at < createdAt || at > now);
    });
    expect(outOfOrder.map(({ id }) => id)).toEqual([]);
  });

  test("보드의 Closed 열에 보이도록 오늘 닫힌 작업 이슈가 있다", () => {
    const closedToday = issues.filter(
      ({ type, closedAt }) =>
        type !== "decision" && closedAt !== undefined && localDay(closedAt) === localDay(now),
    );
    expect(closedToday.length).toBeGreaterThan(0);
  });
});

test("관계가 가리키는 이슈는 모두 데모 데이터에 있다", () => {
  const issues = acmeIssues(at(12, 0), WORKSPACE);
  const ids = new Set(issues.map(({ id }) => id));
  const missing = issues.flatMap(relatedIds).filter((id) => !ids.has(id));
  expect(missing).toEqual([]);
});

test("import 레코드의 상태는 착수, 종료, 보류 시각을 따른다", () => {
  const base: DemoIssue = {
    id: "acme-1",
    title: "t",
    type: "task",
    priority: 2,
    description: "",
    createdAt: 0,
  };
  const statusOf = (issue: Partial<DemoIssue>) => toImportRecord({ ...base, ...issue }).status;

  expect(statusOf({})).toBe("open");
  expect(statusOf({ startedAt: 1 })).toBe("in_progress");
  expect(statusOf({ startedAt: 1, closedAt: 2 })).toBe("closed");
  expect(statusOf({ deferUntil: 3 })).toBe("deferred");
});

function relatedIds(issue: DemoIssue): string[] {
  return [
    ...(issue.parent ? [issue.parent] : []),
    ...(issue.blockedBy ?? []),
    ...(issue.related ?? []),
    ...(issue.discoveredFrom ? [issue.discoveredFrom] : []),
  ];
}
