import Link from "next/link";
import { useState } from "react";
import {
  BOTTLENECK_ORDER,
  type Bottleneck,
  type DeadlineKind,
} from "@/client/modules/focus/domain/focusBottlenecks";
import { DUE_SOON_DAYS } from "@/client/modules/focus/domain/focusDeadlines";
import { NEXT_UP_LIMIT } from "@/client/modules/focus/domain/focusView";
import { workState } from "@/client/modules/issues/domain/workState";
import { useGraphHref } from "@/client/ui/address/useGraphHref";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { GroupHeading } from "@/client/ui/designSystem/GroupHeading";
import { CoveredIssueIdButton, CoveredIssueRow } from "@/client/ui/issues/CoveredIssueRow";
import { IssueChip, PriorityChip } from "@/client/ui/issues/IssueChip";
import { useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { workStateTone } from "@/client/ui/issues/issueLabels";
import { dueAtLabel } from "@/client/ui/issues/issueTime";
import { IssueTypeTag } from "@/client/ui/issues/IssueTypeTag";
import { WaiterCount } from "@/client/ui/issues/WaiterCount";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";

/** 접어 둘 때 보이는 후보 수입니다. 같은 열의 다음에 할 일과 같은 길이로 맞춥니다. */
const COLLAPSED_LIMIT = NEXT_UP_LIMIT;

/**
 * 다른 이슈를 막고 있는 이슈를 정렬 기준과 함께 보입니다. 행마다 지금 상태, 대기 수, 닫으면 바로 작업 가능해지는 이슈 수,
 * 마감 목록에 든 후속 이슈를 보이고, 선행·후속 그래프로 이동할 수 있습니다.
 * 후보가 COLLAPSED_LIMIT개보다 많으면 앞의 후보만 보이고, 모두 보기로 나머지를 펼칩니다.
 */
export function BottlenecksSection({ bottlenecks }: { bottlenecks: Bottleneck[] }) {
  const messages = useMessages();
  const text = messages.focus.bottlenecks;
  const [expanded, setExpanded] = useState(false);
  const collapsible = bottlenecks.length > COLLAPSED_LIMIT;
  const shown = expanded ? bottlenecks : bottlenecks.slice(0, COLLAPSED_LIMIT);
  return (
    <section aria-label={text.title} className="flex flex-col gap-2">
      <GroupHeading title={text.title} count={bottlenecks.length}>
        {collapsible && (
          <button
            type="button"
            className="ml-auto text-xs font-medium hover:underline"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? text.showFewer : text.showAll(bottlenecks.length)}
          </button>
        )}
      </GroupHeading>
      <p className="px-1 text-xs text-emphasis-60">{text.order(BOTTLENECK_ORDER)}</p>
      {bottlenecks.length === 0 ? (
        <EmptyState message={text.empty} variant="compact" />
      ) : (
        <ul className="surface flex flex-col divide-y divide-base-300">
          {shown.map((bottleneck) => (
            <BottleneckRow key={bottleneck.issue.id} bottleneck={bottleneck} />
          ))}
        </ul>
      )}
    </section>
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
        {/* 닫는다고 가정한 계산과 섞이지 않도록, bd가 정한 지금 상태를 따로 보입니다. */}
        <IssueChip
          tone={workStateTone(state)}
          className="relative shrink-0"
          title={text.state(stateLabel)}
        >
          {stateLabel}
        </IssueChip>
        {issue.priority !== null && <PriorityChip priority={issue.priority} />}
        <CoveredIssueIdButton
          issueId={issue.id}
          short
          className="ml-auto min-w-8 shrink-0 rounded text-right text-xs whitespace-nowrap text-emphasis-50"
        />
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-19 text-xs text-emphasis-60">
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
