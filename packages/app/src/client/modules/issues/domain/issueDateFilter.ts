import type { Issue } from "@beads-desk/bd/issue";

export type IssueDateField = "created" | "closed";

/**
 * 이슈를 만든 날이나 닫은 날로 거르는 조건입니다.
 * from과 to는 "YYYY-MM-DD" 형식의 현지 날짜이고, 둘 다 그날 하루 전체를 포함합니다. null이면 그쪽 끝을 열어 둡니다.
 */
export type IssueDateFilter = {
  field: IssueDateField;
  from: string | null;
  to: string | null;
};

/** 날짜가 하나도 없으면 거르지 않습니다. 닫은 날 기준이면 닫히지 않은 이슈는 빠집니다. 순서는 바꾸지 않습니다. */
export function filterByDate(issues: Issue[], { field, from, to }: IssueDateFilter): Issue[] {
  if (from === null && to === null) return issues;
  const { start, end } = localDayRange(from, to);
  return issues.filter((issue) => {
    const time = field === "closed" ? issue.closedAt : issue.createdAt;
    return time !== null && time >= start && time < end;
  });
}

/** 주소에서 읽은 값을 조건으로 바꿉니다. 알 수 없는 기준은 만든 날로, 올바르지 않은 날짜는 없는 것으로 봅니다. */
export function parseIssueDateFilter(
  field: string | null,
  from: string | null,
  to: string | null,
): IssueDateFilter {
  return {
    field: field === "closed" ? "closed" : "created",
    from: parseLocalDay(from),
    to: parseLocalDay(to),
  };
}

/**
 * 시작일과 종료일("YYYY-MM-DD")이 덮는 시각 범위입니다. start 이상 end 미만이 범위 안이고, 두 날 모두 하루 전체를 포함합니다.
 * 날짜가 null인 쪽은 끝을 열어 두어 -Infinity나 Infinity입니다. 날짜로 기록을 거르는 화면은 모두 이 경계를 씁니다.
 */
export function localDayRange(
  from: string | null,
  to: string | null,
): { start: number; end: number } {
  return {
    start: from === null ? -Infinity : localDayStart(from),
    end: to === null ? Infinity : localDayStart(to, 1),
  };
}

/** 주소에서 읽은 날짜가 실제로 있는 "YYYY-MM-DD" 날짜면 그대로, 아니면 null을 돌려줍니다. */
export function parseLocalDay(value: string | null): string | null {
  return isLocalDay(value) ? value : null;
}

/** 시각이 속한 현지 날짜를 "YYYY-MM-DD"로 돌려줍니다. 지금 화면 통계가 하루씩 셀 때 이 필터와 같은 경계를 씁니다. */
export function localDayOf(time: number): string {
  const date = new Date(time);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 하루의 경계는 브라우저 현지 시각의 자정입니다. 날짜 칸에 고른 날과 사용자가 겪은 하루가 같아야 하기 때문입니다.
function localDayStart(day: string, daysAfter = 0): number {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date + daysAfter).getTime();
}

function isLocalDay(value: string | null): value is string {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, date] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, date);
  return parsed.getMonth() === month - 1 && parsed.getDate() === date;
}
