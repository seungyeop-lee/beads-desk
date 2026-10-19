import type { Issue } from "@beads-desk/bd/issue";
import { describe, expect, test } from "vitest";
import type { EpicSummary } from "@/shared/contract/epics";
import { issue } from "@/shared/domain/issues/issueFixture";
import { durationParts, focusStats } from "./focusStats";

function epic(id: string, totalChildren: number, closedChildren: number, status = "open") {
  return { epic: issue(id, { issueType: "epic", status }), totalChildren, closedChildren };
}

// 현지 시각으로 만들어, 테스트를 실행하는 시간대와 관계없이 하루의 경계를 확인합니다.
const at = (day: number, hour = 0, minute = 0, ms = 0) =>
  new Date(2026, 9, day, hour, minute, 0, ms).getTime();
const NOW = at(15, 15);
const MINUTE = 60_000;

const stats = (issues: Issue[], epics: EpicSummary[] = []) => focusStats(issues, epics, NOW);

describe("daily", () => {
  test("오늘을 마지막으로 7일을 현지 날짜로 나눠 만든 수와 닫은 수를 센다", () => {
    const { daily } = stats([
      issue("old", { createdAt: at(8, 23, 59, 999) }),
      issue("first-day", { createdAt: at(9) }),
      issue("made-and-closed", {
        createdAt: at(14, 23, 59, 999),
        status: "closed",
        closedAt: at(15),
      }),
    ]);

    expect(daily.map(({ day }) => day)).toEqual([
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
    ]);
    expect(daily.map(({ created }) => created)).toEqual([1, 0, 0, 0, 0, 1, 0]);
    expect(daily.map(({ closed }) => closed)).toEqual([0, 0, 0, 0, 0, 0, 1]);
  });

  test("epic, decision, milestone은 세지 않는다", () => {
    const { daily } = stats([
      issue("epic", { issueType: "epic", createdAt: at(15) }),
      issue("milestone", { issueType: "milestone", createdAt: at(15) }),
      issue("decision", {
        issueType: "decision",
        createdAt: at(15),
        status: "closed",
        closedAt: at(15),
      }),
      issue("bug", { issueType: "bug", createdAt: at(15) }),
    ]);

    expect(daily.at(-1)).toEqual({ day: "2026-10-15", created: 1, closed: 0 });
  });
});

describe("cycleTime과 leadTime", () => {
  test("7일 안에 닫힌 이슈로 착수→닫기와 등록→닫기 시간의 중앙값을 구한다", () => {
    const closed = (id: string, created: number, started: number | null, closedAt: number) =>
      issue(id, { status: "closed", createdAt: created, startedAt: started, closedAt });

    const result = stats([
      closed("a", at(10, 9), at(10, 10), at(10, 10, 10)),
      closed("b", at(12, 9), at(12, 9, 30), at(12, 10)),
      closed("not-started", at(14, 9), null, at(14, 12)),
      closed("before-window", at(1), at(1), at(8, 23, 59)),
    ]);

    expect(result.cycleTime).toEqual({ median: 20 * MINUTE, count: 2 });
    expect(result.leadTime).toEqual({ median: 70 * MINUTE, count: 3 });
  });

  test("7일 안에 닫힌 이슈가 없으면 중앙값은 null이다", () => {
    expect(stats([issue("open")]).cycleTime).toEqual({ median: null, count: 0 });
  });

  test("epic과 decision은 계산에서 뺀다", () => {
    const result = stats([
      issue("epic", {
        issueType: "epic",
        status: "closed",
        createdAt: at(15),
        closedAt: at(15, 1),
      }),
    ]);

    expect(result.leadTime).toEqual({ median: null, count: 0 });
  });
});

describe("openBy", () => {
  test("닫히지 않은 이슈를 우선순위, 유형, 담당자별로 많은 순서로 세고, 결정은 뺀다", () => {
    const { openBy } = stats([
      issue("a", { priority: 1, issueType: "bug", assignee: "kim" }),
      issue("b", { priority: 2 }),
      issue("c", { priority: 2, issueType: "epic" }),
      issue("closed", { status: "closed", closedAt: at(15) }),
      issue("decision", { issueType: "decision" }),
    ]);

    expect(openBy.priority).toEqual([
      { value: 2, count: 2 },
      { value: 1, count: 1 },
    ]);
    expect(openBy.type).toEqual([
      { value: "bug", count: 1 },
      { value: "epic", count: 1 },
      { value: "task", count: 1 },
    ]);
    expect(openBy.assignee).toEqual([
      { value: null, count: 2 },
      { value: "kim", count: 1 },
    ]);
  });
});

describe("정리 신호", () => {
  test("보류는 작업 상태로 세고, 막고 있는 이슈가 남은 보류 이슈도 센다", () => {
    expect(
      stats([
        issue("deferred", { status: "deferred" }),
        issue("deferred-blocked", { status: "deferred", blockedBy: ["open"] }),
        issue("open"),
      ]).deferred,
    ).toBe(2);
  });

  test("닫을 수 있는 에픽은 하위가 하나 이상이고 모두 닫힌 열린 에픽이다", () => {
    const result = stats(
      [],
      [
        epic("done", 2, 2),
        epic("partly", 2, 1),
        epic("empty", 0, 0),
        epic("closed", 1, 1, "closed"),
      ],
    );

    expect(result.closableEpics).toBe(1);
  });
});

describe("durationParts", () => {
  test("1시간 미만은 분, 2일 미만은 시간, 그 이상은 일로 소수 첫째 자리까지 나타낸다", () => {
    const HOUR = 60 * MINUTE;

    expect(durationParts(7.4 * MINUTE)).toEqual({ unit: "minutes", value: 7 });
    expect(durationParts(59 * MINUTE)).toEqual({ unit: "minutes", value: 59 });
    expect(durationParts(90 * MINUTE)).toEqual({ unit: "hours", value: 1.5 });
    expect(durationParts(47 * HOUR)).toEqual({ unit: "hours", value: 47 });
    expect(durationParts(60 * HOUR)).toEqual({ unit: "days", value: 2.5 });
  });

  test("1분이 안 되는 시간도 0분이 아니라 1분으로 나타낸다", () => {
    expect(durationParts(10_000)).toEqual({ unit: "minutes", value: 1 });
  });
});
