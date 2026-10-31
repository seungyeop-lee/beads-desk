import Link from "next/link";
import {
  BOTTLENECK_ORDER,
  type Bottleneck,
  type DeadlineKind,
} from "@/client/modules/focus/domain/focusBottlenecks";
import { DUE_SOON_DAYS } from "@/client/modules/focus/domain/focusDeadlines";
import { workState } from "@/client/modules/issues/domain/workState";
import { useGraphHref } from "@/client/ui/address/useGraphHref";
import { CoveredIssueIdButton, CoveredIssueRow } from "@/client/ui/issues/CoveredIssueRow";
import { IssueChip, PriorityChip } from "@/client/ui/issues/IssueChip";
import { useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { workStateTone } from "@/client/ui/issues/issueLabels";
import { dueAtLabel } from "@/client/ui/issues/issueTime";
import { IssueTypeTag } from "@/client/ui/issues/IssueTypeTag";
import { WaiterCount } from "@/client/ui/issues/WaiterCount";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { FocusListSection, type ListBox } from "./FocusList";

/**
 * 다른 이슈를 막고 있는 이슈를 정렬 기준과 함께 보입니다. 행마다 지금 상태, 대기 수, 닫으면 바로 작업 가능해지는 이슈 수,
 * 마감 목록에 든 후속 이슈를 보이고, 선행·후속 그래프로 이동할 수 있습니다.
 * 이슈 목록에 병목 보기 탭이 없으므로, 후보가 많으면 앞의 일부만 보이고 나머지는 그 자리에서 펼칩니다.
 */
export function BottlenecksSection({
  bottlenecks,
  box,
}: {
  bottlenecks: Bottleneck[];
  box?: ListBox;
}) {
  const text = useMessages().focus.bottlenecks;
  return (
    <FocusListSection
      box={box}
      title={text.title}
      empty={text.empty}
      items={bottlenecks}
      note={<p className="px-1 text-xs text-emphasis-60">{text.order(BOTTLENECK_ORDER)}</p>}
      renderItem={(bottleneck) => (
        <BottleneckRow key={bottleneck.issue.id} bottleneck={bottleneck} />
      )}
    />
  );
}

function BottleneckRow({
  bottleneck: { issue, waiters, unblocks, deadlines },
}: {
  bottleneck: Bottleneck;
}) {
  const messages = useMessages();
  const locale = useLocale();
  const issueHref = useIssueHref();
  const graphHref = useGraphHref();
  const text = messages.focus.bottlenecks;
  const kindLabels: Record<DeadlineKind, string> = {
    overdue: messages.focus.deadlines.overdue,
    dueToday: messages.focus.deadlines.dueToday,
    dueSoon: messages.focus.deadlines.dueSoon(DUE_SOON_DAYS),
  };
  const title = issue.title || messages.common.untitled;
  const state = workState(issue);
  const stateLabel = messages.workStates.labels[state];
  return (
    <CoveredIssueRow
      as="li"
      className="flex flex-col gap-1 px-4 py-3 text-sm hover:bg-base-200/60"
      issueId={issue.id}
      title={title}
      cover={{ href: issueHref(issue.id) }}
    >
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap">
        <span className="w-16 shrink-0 text-xs">
          <IssueTypeTag issueType={issue.issueType} />
        </span>
        <span className="min-w-0 grow basis-[calc(100%-5rem)] truncate font-medium sm:basis-0">
          {title}
        </span>
        <CoveredIssueIdButton
          issueId={issue.id}
          short
          className="ml-auto min-w-8 shrink-0 rounded text-right text-xs whitespace-nowrap text-emphasis-50"
        />
      </span>
      {/* 좁은 열에서 제목이 잘리지 않도록 상태와 우선순위는 제목 줄 대신 이 줄에 둡니다. */}
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-19 text-xs text-emphasis-60">
        {/* 닫는다고 가정한 계산과 섞이지 않도록, bd가 정한 지금 상태를 따로 보입니다. */}
        <IssueChip
          tone={workStateTone(state)}
          className="relative shrink-0"
          title={text.state(stateLabel)}
        >
          {stateLabel}
        </IssueChip>
        {issue.priority !== null && <PriorityChip priority={issue.priority} />}
        <WaiterCount count={waiters} className="relative" />
        <span className="relative tabular-nums" title={text.unblocksHint}>
          {text.unblocks(unblocks)}
        </span>
        <Link
          href={graphHref({ kind: "center", id: issue.id })}
          scroll={false}
          className="relative ml-auto font-medium hover:underline"
          aria-label={text.openGraphOf(issue.id)}
        >
          {messages.graph.scopes.center} →
        </Link>
      </span>
      {deadlines.map(({ issue: follower, kind }) => (
        <span
          key={follower.id}
          className={`truncate pl-19 text-xs ${kind === "overdue" ? "text-error" : "text-emphasis-60"}`}
        >
          → <span className="font-semibold">{kindLabels[kind]}</span> · {follower.id}{" "}
          {follower.title || messages.common.untitled} ·{" "}
          <span className="tabular-nums">{dueAtLabel(locale, follower.dueAt)}</span>
        </span>
      ))}
    </CoveredIssueRow>
  );
}
