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
  const start = from === null ? -Infinity : localDayStart(from);
  const end = to === null ? Infinity : localDayStart(to, 1);
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
    from: isLocalDay(from) ? from : null,
    to: isLocalDay(to) ? to : null,
  };
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
