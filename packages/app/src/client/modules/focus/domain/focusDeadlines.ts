import { isOverdue, type Issue } from "@beads-desk/bd/issue";
import {
  localDayOf,
  localDayPlus,
  localDayStart,
} from "@/client/modules/issues/domain/issueDateFilter";

/** 마감 임박으로 보이는 날 수입니다. 오늘을 빼고 내일부터 셉니다. */
export const DUE_SOON_DAYS = 3;

export type DatedIssue = Issue & { dueAt: number };

export type FocusDeadlines = {
  /** bd list --overdue와 같은 이슈입니다. */
  overdue: DatedIssue[];
  /** 기한 초과가 아니고 내일 0시 전에 마감되는 이슈입니다. */
  dueToday: DatedIssue[];
  /** 내일 0시부터 DUE_SOON_DAYS일 동안 마감되는 이슈입니다. */
  dueSoon: DatedIssue[];
  /** 오늘 마감의 날짜("YYYY-MM-DD")입니다. */
  today: string;
  /** 마감 임박의 첫날과 마지막 날("YYYY-MM-DD")입니다. 둘 다 그날 하루 전체를 포함합니다. */
  soon: { from: string; to: string };
  /** 이슈가 그대로여도 분류가 바뀌는 가장 이른 시각(epoch ms)입니다. 다음 현지 자정이나, 가장 이른 마감 시각을 넘는 순간입니다. */
  nextChange: number;
};

/**
 * 닫히지 않은 마감일이 있는 이슈를 now 기준으로 기한 초과, 오늘 마감, 마감 임박으로 나누고, 각 목록을 마감이 이른 순으로 둡니다.
 * 기한 초과는 bd의 판정(isOverdue)을 그대로 쓰고, 오늘과 마감 임박의 하루 경계는 browser 현지 시각의 자정입니다.
 */
export function focusDeadlines(issues: Issue[], now: number): FocusDeadlines {
  const today = localDayOf(now);
  const tomorrowStart = localDayStart(today, 1);
  const soonEnd = localDayStart(today, 1 + DUE_SOON_DAYS);
  const dated = issues
    .filter((issue): issue is DatedIssue => issue.status !== "closed" && issue.dueAt !== null)
    .sort((a, b) => a.dueAt - b.dueAt);
  const notOverdue = dated.filter((issue) => !isOverdue(issue, now));
  return {
    overdue: dated.filter((issue) => isOverdue(issue, now)),
    dueToday: notOverdue.filter((issue) => issue.dueAt < tomorrowStart),
    dueSoon: notOverdue.filter((issue) => issue.dueAt >= tomorrowStart && issue.dueAt < soonEnd),
    today,
    soon: { from: localDayPlus(today, 1), to: localDayPlus(today, DUE_SOON_DAYS) },
    // 마감 시각이 지금보다 이를 때 기한 초과이므로, 마감 시각 1ms 뒤에 분류가 바뀝니다.
    nextChange: Math.min(tomorrowStart, ...notOverdue.map((issue) => issue.dueAt + 1)),
  };
}
