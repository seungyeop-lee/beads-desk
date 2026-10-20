import { localDayOf, localDayRange } from "@/client/modules/issues/domain/issueDateFilter";
import type { ActivityEntry, ActivityFeedQuery } from "@/shared/contract/activityFeed";

/** 처음에 보이고, "더 보기"를 누를 때마다 더 읽는 기록 수입니다. */
export const ACTIVITY_PAGE_SIZE = 50;

/** 고른 날짜 범위입니다. "YYYY-MM-DD" 형식의 현지 날짜이고 둘 다 그날 하루 전체를 포함합니다. null이면 그쪽 끝을 열어 둡니다. */
export type ActivityDateRange = { from: string | null; to: string | null };

/** 날짜 범위를 조회 조건으로 바꿉니다. 하루의 경계는 이슈 목록의 날짜 필터와 같습니다. pages는 지금까지 읽은 쪽 수입니다. */
export function activityFeedQuery(
  { from, to }: ActivityDateRange,
  pages: number,
): ActivityFeedQuery {
  const { start, end } = localDayRange(from, to);
  return {
    since: Number.isFinite(start) ? start : null,
    until: Number.isFinite(end) ? end : null,
    limit: pages * ACTIVITY_PAGE_SIZE,
  };
}

/** 피드 목록에 차례로 그리는 줄입니다. day는 그날의 첫 기록 앞에 두는 날짜 머리글이고, seen은 마지막으로 본 시각의 구분선입니다. */
export type ActivityFeedRow =
  | { kind: "day"; day: string }
  | { kind: "seen" }
  | { kind: "entry"; entry: ActivityEntry };

/**
 * 새것부터 놓인 기록에 현지 날짜 머리글과 구분선을 끼워 넣습니다.
 * 구분선은 seenAt 이전(같은 시각 포함)의 첫 기록 앞에 하나만 둡니다. seenAt이 null이거나 보이는 기록이 모두 그 뒤에 생겼으면 두지 않습니다.
 * 구분선 바로 뒤 기록이 새 날의 첫 기록이면 구분선을 날짜 머리글 앞에 둡니다.
 */
export function activityFeedRows(
  entries: readonly ActivityEntry[],
  seenAt: number | null,
): ActivityFeedRow[] {
  const seenIndex = seenAt === null ? -1 : entries.findIndex((entry) => entry.at <= seenAt);
  const rows: ActivityFeedRow[] = [];
  let previousDay: string | null = null;
  entries.forEach((entry, index) => {
    if (index === seenIndex) rows.push({ kind: "seen" });
    const day = localDayOf(entry.at);
    if (day !== previousDay) rows.push({ kind: "day", day });
    previousDay = day;
    rows.push({ kind: "entry", entry });
  });
  return rows;
}

/** 날짜를 하나라도 골랐는지입니다. 고른 상태로 화면을 열면 마지막으로 본 시각을 갱신하지 않습니다. */
export function hasDateRange({ from, to }: ActivityDateRange): boolean {
  return from !== null || to !== null;
}
