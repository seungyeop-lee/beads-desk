import { localDayOf, localDayPlus } from "./issueDateFilter";

/**
 * 날짜 지정으로 보류할 때 고를 수 있는 가장 이른 날("YYYY-MM-DD")입니다.
 * bd는 고른 날 0시까지 보류하므로, 오늘을 고르면 기한이 이미 지나 바로 다시 열립니다. 그래서 내일부터 고릅니다.
 */
export function earliestDeferDay(now: number): string {
  return localDayPlus(localDayOf(now), 1);
}
