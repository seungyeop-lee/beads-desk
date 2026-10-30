import { isWork, type Issue } from "@beads-desk/bd/issue";
import { byPriorityThenCreated } from "@/client/modules/issues/domain/issueSort";
import { workState, type WorkState } from "@/client/modules/issues/domain/workState";
import { waitingIssueIds } from "@/shared/domain/issues/waiterCounts";
import type { DatedIssue, FocusDeadlines } from "./focusDeadlines";

/** 지금 화면 마감 목록의 묶음입니다. */
export type DeadlineKind = "overdue" | "dueToday" | "dueSoon";

export type DeadlineEvidence = { issue: DatedIssue; kind: DeadlineKind };

export type Bottleneck = {
  issue: Issue;
  /** 이 이슈가 닫히면 막힘이 풀리는 쪽으로 이어진 닫히지 않은 후속 이슈 수입니다. 행마다 보이는 대기 수와 같습니다. */
  waiters: number;
  /**
   * 이 이슈 하나만 기다리는 후속 이슈 가운데, 이 이슈를 닫으면 바로 작업 가능이나 진행 중이 되는 이슈 수입니다.
   * 닫는다고 가정한 계산이라, 후속 이슈가 지금 bd ready에 있는지와는 다릅니다.
   */
  unblocks: number;
  /** 후속 이슈 가운데 지금 화면 마감 목록에 든 이슈입니다. 마감 시각이 이른 순입니다. */
  deadlines: DeadlineEvidence[];
};

/**
 * 병목 후보를 정렬하는 기준이며, 앞 기준이 같을 때만 다음 기준으로 가릅니다.
 * 화면의 정렬 설명도 이 목록의 순서대로 만듭니다.
 */
export const BOTTLENECK_ORDER = ["waiters", "earliestDeadline", "unblocks", "priority"] as const;

export type BottleneckOrderKey = (typeof BOTTLENECK_ORDER)[number];

const compareBy: Record<BottleneckOrderKey, (a: Bottleneck, b: Bottleneck) => number> = {
  waiters: (a, b) => b.waiters - a.waiters,
  // 마감 목록에 든 후속 이슈가 없는 후보는 뒤에 둡니다.
  earliestDeadline: (a, b) => {
    const dueAt = (bottleneck: Bottleneck) => bottleneck.deadlines[0]?.issue.dueAt ?? Infinity;
    return dueAt(a) === dueAt(b) ? 0 : dueAt(a) < dueAt(b) ? -1 : 1;
  },
  unblocks: (a, b) => b.unblocks - a.unblocks,
  priority: (a, b) => byPriorityThenCreated(a.issue, b.issue),
};

/** 막힘이 풀리면 바로 손댈 수 있는 작업 상태입니다. */
const WORKABLE_STATES: ReadonlySet<WorkState> = new Set(["ready", "in_progress"]);

/**
 * 닫히지 않은 다른 이슈를 막고 있는, 직접 작업하는 유형의 이슈를 병목 후보로 모읍니다. 후보 자신이 막혀 있어도 담고, 지금 상태는 화면이 따로 보입니다.
 * 순서는 BOTTLENECK_ORDER를 따릅니다.
 * 마감 근거는 마감 목록(focusDeadlines)의 분류를 그대로 쓰므로, 마감 목록이 다시 나뉘면 이 계산도 다시 해야 합니다.
 * issues는 거르기 전의 전체 목록이어야 대기 수가 다른 화면과 같습니다. now는 보류 기한이 지났는지 가르는 현재 시각(epoch ms)입니다.
 */
export function focusBottlenecks(
  issues: Issue[],
  deadlines: FocusDeadlines,
  now: number,
): Bottleneck[] {
  const waiting = waitingIssueIds(issues);
  const unblocks = soleBlockerCounts(issues, now);
  const dated: DeadlineEvidence[] = [
    ...deadlines.overdue.map((issue) => ({ issue, kind: "overdue" as const })),
    ...deadlines.dueToday.map((issue) => ({ issue, kind: "dueToday" as const })),
    ...deadlines.dueSoon.map((issue) => ({ issue, kind: "dueSoon" as const })),
  ];
  return issues
    .flatMap((issue) => {
      const waiters = waiting.get(issue.id);
      if (!waiters || issue.status === "closed" || !isWork(issue)) return [];
      return [
        {
          issue,
          waiters: waiters.size,
          unblocks: unblocks.get(issue.id) ?? 0,
          deadlines: dated.filter((evidence) => waiters.has(evidence.issue.id)),
        },
      ];
    })
    .sort((a, b) => {
      for (const key of BOTTLENECK_ORDER) {
        const order = compareBy[key](a, b);
        if (order !== 0) return order;
      }
      return 0;
    });
}

/** 막고 있는 이슈가 하나뿐이고, 그 이슈가 닫히면 손댈 수 있게 되는 이슈를 막고 있는 이슈 id마다 셉니다. */
function soleBlockerCounts(issues: Issue[], now: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (const issue of issues) {
    const [blocker, ...others] = new Set(issue.blockedBy);
    if (blocker === undefined || others.length > 0) continue;
    // bd blocked에서 빠지면 bd ready에 들 수 있으므로, 막힘을 뺀 나머지 조건(저장 상태, 사람 판단, 유형)으로 상태를 정합니다.
    // bd ready는 열린 이슈라도 보류 기한(defer_until)이 아직 오지 않았으면 돌려주지 않습니다.
    const ready = issue.deferUntil === null || issue.deferUntil <= now;
    if (!WORKABLE_STATES.has(workState({ ...issue, blockedBy: undefined, ready }))) continue;
    counts.set(blocker, (counts.get(blocker) ?? 0) + 1);
  }
  return counts;
}
