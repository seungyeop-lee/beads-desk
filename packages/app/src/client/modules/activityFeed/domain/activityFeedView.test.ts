import { describe, expect, test } from "vitest";
import type { ActivityEntry } from "@/shared/contract/activityFeed";
import {
  ACTIVITY_PAGE_SIZE,
  activityFeedQuery,
  activityFeedRows,
  hasDateRange,
  type ActivityFeedRow,
} from "./activityFeedView";

// 현지 시각으로 만들어, 테스트를 실행하는 시간대와 관계없이 하루의 경계를 확인합니다.
const at = (day: number, hour = 0, minute = 0, ms = 0) =>
  new Date(2026, 9, day, hour, minute, 0, ms).getTime();

function entry(key: string, time: number): ActivityEntry {
  return {
    key,
    kind: "created",
    at: time,
    issueId: key,
    title: key,
    actor: null,
    text: null,
    changes: [],
  };
}

/** 줄을 읽기 쉬운 문자열로 바꿉니다. 날짜 머리글은 `# 날짜`, 구분선은 `---`, 기록은 key입니다. */
function shape(rows: ActivityFeedRow[]): string[] {
  return rows.map((row) =>
    row.kind === "day" ? `# ${row.day}` : row.kind === "seen" ? "---" : row.entry.key,
  );
}

describe("activityFeedQuery", () => {
  test("시작일 자정부터 종료일이 끝나는 자정 전까지를 이슈 목록 날짜 필터와 같은 경계로 조회한다", () => {
    expect(activityFeedQuery({ from: "2026-10-14", to: "2026-10-15" }, 1)).toEqual({
      since: at(14),
      until: at(16),
      limit: ACTIVITY_PAGE_SIZE,
    });
  });

  test("비워 둔 쪽 끝은 열어 두고, 읽은 쪽 수만큼 개수를 늘린다", () => {
    expect(activityFeedQuery({ from: null, to: "2026-10-15" }, 3)).toEqual({
      since: null,
      until: at(16),
      limit: 3 * ACTIVITY_PAGE_SIZE,
    });
    expect(activityFeedQuery({ from: null, to: null }, 1)).toEqual({
      since: null,
      until: null,
      limit: ACTIVITY_PAGE_SIZE,
    });
  });

  test("날짜를 하나라도 골랐는지 알려 준다", () => {
    expect(hasDateRange({ from: null, to: null })).toBe(false);
    expect(hasDateRange({ from: "2026-10-14", to: null })).toBe(true);
    expect(hasDateRange({ from: null, to: "2026-10-14" })).toBe(true);
  });
});

describe("activityFeedRows", () => {
  const entries = [
    entry("new-2", at(15, 9)),
    entry("new-1", at(15, 8)),
    entry("seen-2", at(15, 7)),
    entry("seen-1", at(14, 23, 59)),
  ];

  test("현지 날짜가 바뀌는 기록 앞에 날짜 머리글을 둔다", () => {
    expect(shape(activityFeedRows(entries, null))).toEqual([
      "# 2026-10-15",
      "new-2",
      "new-1",
      "seen-2",
      "# 2026-10-14",
      "seen-1",
    ]);
  });

  test("마지막으로 본 시각 뒤에 생긴 기록과 그 전 기록 사이에 구분선을 하나 둔다. 본 시각과 같은 시각의 기록은 본 기록이다", () => {
    expect(shape(activityFeedRows(entries, at(15, 7)))).toEqual([
      "# 2026-10-15",
      "new-2",
      "new-1",
      "---",
      "seen-2",
      "# 2026-10-14",
      "seen-1",
    ]);
  });

  test("구분선 뒤 기록이 새 날의 첫 기록이면 구분선을 날짜 머리글 앞에 둔다", () => {
    expect(shape(activityFeedRows(entries, at(15, 0)))).toEqual([
      "# 2026-10-15",
      "new-2",
      "new-1",
      "seen-2",
      "---",
      "# 2026-10-14",
      "seen-1",
    ]);
  });

  test("새 기록이 없으면 맨 앞에, 보이는 기록이 모두 새 기록이면 구분선을 두지 않는다", () => {
    expect(shape(activityFeedRows(entries, at(16))).slice(0, 2)).toEqual(["---", "# 2026-10-15"]);
    expect(shape(activityFeedRows(entries, at(1)))).not.toContain("---");
  });
});
