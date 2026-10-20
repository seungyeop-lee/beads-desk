import type { ActivityDateRange } from "@/client/modules/activityFeed/domain/activityFeedView";
import { parseLocalDay } from "@/client/modules/issues/domain/issueDateFilter";

const FROM_PARAM = "from";
const TO_PARAM = "to";

/** 활동 화면 주소입니다. 고른 날짜 범위를 이슈 목록과 같은 이름(from, to)으로 남겨 새로고침해도 같은 기간을 엽니다. */
export function activityFeedHref({ from, to }: ActivityDateRange): string {
  const params = new URLSearchParams();
  if (from) params.set(FROM_PARAM, from);
  if (to) params.set(TO_PARAM, to);
  return params.size > 0 ? `/activity?${params}` : "/activity";
}

/** 올바르지 않은 날짜는 고르지 않은 것으로 봅니다. */
export function readActivityFeedAddress(params: URLSearchParams): ActivityDateRange {
  return { from: parseLocalDay(params.get(FROM_PARAM)), to: parseLocalDay(params.get(TO_PARAM)) };
}
