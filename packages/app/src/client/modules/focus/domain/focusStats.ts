import { NON_WORK_TYPES, type Issue } from "@beads-desk/bd/issue";
import type { EpicSummary } from "@/shared/contract/epics";
import { localDayOf, localDayPlus } from "@/client/modules/issues/domain/issueDateFilter";
import { isNotDecision } from "@/client/modules/issues/domain/issueListView";
import { workState } from "@/client/modules/issues/domain/workState";
import { isClosableEpic } from "@/shared/domain/epics/closableEpic";

/** 처리량과 처리 시간을 보는 기간입니다. 오늘을 포함합니다. */
export const STATS_DAYS = 7;

export type DailyFlow = {
  /** 현지 날짜 "YYYY-MM-DD"입니다. */
  day: string;
  created: number;
  closed: number;
};

export type DurationStat = {
  /** 밀리초입니다. 계산할 이슈가 없으면 null입니다. */
  median: number | null;
  /** 중앙값을 구하는 데 쓴 이슈 수입니다. */
  count: number;
};

export type ValueCount<T> = { value: T; count: number };

export type FocusStats = {
  /** 오래된 날부터 오늘까지 STATS_DAYS개입니다. */
  daily: DailyFlow[];
  /** 착수부터 닫기까지 걸린 시간입니다. */
  cycleTime: DurationStat;
  /** 등록부터 닫기까지 걸린 시간입니다. 착수 시간과의 차이가 착수하기 전에 기다린 시간입니다. */
  leadTime: DurationStat;
  /** 닫히지 않은 이슈의 분포입니다. 많은 값부터 보입니다. */
  openBy: {
    priority: ValueCount<number | null>[];
    type: ValueCount<string>[];
    assignee: ValueCount<string | null>[];
  };
  deferred: number;
  /** 정리 페이지와 같은 기준(isClosableEpic)으로 센 닫을 수 있는 에픽 수입니다. */
  closableEpics: number;
};

/**
 * 지금 화면의 통계를 이미 읽어 온 목록에서 계산합니다. bd status의 처리 시간 값은 믿을 수 없어 쓰지 않습니다.
 * 결정은 지금 화면의 다른 수치처럼 빼고, 처리량과 처리 시간은 직접 작업하지 않는 유형(NON_WORK_TYPES)도 뺍니다.
 */
export function focusStats(issues: Issue[], epics: EpicSummary[], now: number): FocusStats {
  const tracked = issues.filter(isNotDecision);
  const workItems = tracked.filter((issue) => !NON_WORK_TYPES.has(issue.issueType));
  const days = recentDays(now);
  const inWindow = (time: number | null) => time !== null && days.includes(localDayOf(time));
  const closedInWindow = workItems.filter((issue): issue is Issue & { closedAt: number } =>
    inWindow(issue.closedAt),
  );
  const open = tracked.filter((issue) => issue.status !== "closed");

  return {
    daily: days.map((day) => ({
      day,
      created: workItems.filter((issue) => localDayOf(issue.createdAt) === day).length,
      closed: closedInWindow.filter((issue) => localDayOf(issue.closedAt) === day).length,
    })),
    cycleTime: medianOf(
      closedInWindow.flatMap((issue) =>
        issue.startedAt === null ? [] : [issue.closedAt - issue.startedAt],
      ),
    ),
    leadTime: medianOf(closedInWindow.map((issue) => issue.closedAt - issue.createdAt)),
    openBy: {
      priority: countBy(open, (issue) => issue.priority),
      type: countBy(open, (issue) => issue.issueType),
      assignee: countBy(open, (issue) => issue.assignee),
    },
    deferred: tracked.filter((issue) => workState(issue) === "deferred").length,
    closableEpics: epics.filter(isClosableEpic).length,
  };
}

function recentDays(now: number): string[] {
  const today = localDayOf(now);
  return Array.from({ length: STATS_DAYS }, (_, index) =>
    localDayPlus(today, index - (STATS_DAYS - 1)),
  );
}

function medianOf(durations: number[]): DurationStat {
  const sorted = durations.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length === 0
      ? null
      : sorted.length % 2 === 1
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2;
  return { median, count: sorted.length };
}

// 개수가 같으면 값 순서로 두어, 다시 계산해도 순서가 흔들리지 않게 합니다. 값이 없는 것(null)은 뒤에 둡니다.
function countBy<T extends string | number | null>(
  issues: Issue[],
  valueOf: (issue: Issue) => T,
): ValueCount<T>[] {
  const counts = new Map<T, number>();
  for (const issue of issues) counts.set(valueOf(issue), (counts.get(valueOf(issue)) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .toSorted((a, b) => b.count - a.count || compareValues(a.value, b.value));
}

function compareValues(a: string | number | null, b: string | number | null): number {
  if (a === null || b === null) return (a === null ? 1 : 0) - (b === null ? 1 : 0);
  return typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b));
}

export type DurationParts = { unit: "minutes" | "hours" | "days"; value: number };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 걸린 시간을 읽기 좋은 단위로 바꿉니다. agent가 처리하는 이슈는 몇 분 만에 닫히기도 해서 분 단위부터 씁니다. */
export function durationParts(ms: number): DurationParts {
  if (ms < HOUR) return { unit: "minutes", value: Math.max(1, Math.round(ms / MINUTE)) };
  if (ms < 2 * DAY) return { unit: "hours", value: roundToTenth(ms / HOUR) };
  return { unit: "days", value: roundToTenth(ms / DAY) };
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}
