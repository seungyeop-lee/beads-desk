"use client";

import { GroupHeading } from "@/client/ui/designSystem/GroupHeading";
import { ScreenFrame } from "@/client/ui/designSystem/ScreenFrame";
import type { Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { type CSSProperties, type ReactNode } from "react";
import { useFocusView } from "@/client/modules/focus/application/useFocusView";
import {
  DUE_SOON_DAYS,
  type DatedIssue,
  type FocusDeadlines,
} from "@/client/modules/focus/domain/focusDeadlines";
import type { FocusView } from "@/client/modules/focus/domain/focusView";
import type { FocusStats } from "@/client/modules/focus/domain/focusStats";
import type { EpicSummary } from "@/shared/contract/epics";
import { localDate } from "@/client/modules/issues/domain/issueDateFilter";
import { blockersOf, type Blocker } from "@/client/modules/gates/domain/humanGateBlockers";
import type { WorkState } from "@/client/modules/issues/domain/workState";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { HUMAN_DECISION_TONE, workStateTone } from "@/client/ui/issues/issueLabels";
import { WaitingOnLines } from "@/client/ui/issues/BlockerLine";
import { CoveredIssueIdButton, CoveredIssueRow } from "@/client/ui/issues/CoveredIssueRow";
import { HumanDecisionChip } from "@/client/ui/issues/HumanDecisionChip";
import { EpicProgressBar } from "@/client/ui/issues/EpicProgress";
import { PriorityChip } from "@/client/ui/issues/IssueChip";
import { IssueTypeTag } from "@/client/ui/issues/IssueTypeTag";
import { WaiterCount } from "@/client/ui/issues/WaiterCount";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { UserIcon } from "@/client/ui/designSystem/icons";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { useWorkspaceHref } from "@/client/ui/address/workspaceAddress";
import { issueViewHref } from "@/client/ui/address/issueListAddress";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { dueAtLabel } from "@/client/ui/issues/issueTime";
import type { Locale } from "@/shared/contract/locale";
import { BottlenecksSection } from "./BottlenecksSection";
import { FocusStatsSection } from "./FocusStatsSection";
import { FocusListSection, listBoxClasses, useListLimit } from "./FocusList";
import { useMinuteClock } from "@/client/ui/designSystem/useMinuteClock";

/** 요약 칩으로 개수를 보이는 작업 상태입니다. 누르면 이슈 목록의 같은 보기 탭으로 이동합니다. */
const CHIP_STATES = ["in_progress", "ready", "blocked"] as const satisfies WorkState[];

/** 요약 칩의 기한 초과·오늘 마감 경고가 가리키는 마감 구역의 id입니다. */
const DEADLINES_ID = "focus-deadlines";

/**
 * 첫 화면입니다. 위에서부터 개수 요약 칩 한 줄, 흐름 통계, 지금 할 일(진행 중, 다음에 할 일, 마감)과 막힌 곳 풀기(병목, 막힘) 두 열,
 * 에픽 진행률을 보입니다. 목록의 길이 규칙은 FocusList.tsx가 정합니다.
 * 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function FocusScreen() {
  const now = useMinuteClock();
  const {
    issueList,
    epics,
    humanDecisionCount,
    view,
    stats,
    deadlines,
    bottlenecks,
    titles,
    gateTitles,
  } = useFocusView(now);
  const { error, loading } = issueList;
  const issueHref = useIssueHref();
  const messages = useMessages();
  const text = messages.focus;

  return (
    <ScreenFrame variant="spacious">
      <ScreenHeader title={text.title} tone={screenTone("/focus")} loading={loading} />

      {error && <ErrorAlert>{messages.issues.loadFailed(error)}</ErrorAlert>}

      {view && (
        <>
          <SummaryChips
            view={view}
            stats={stats}
            deadlines={deadlines}
            humanDecisionCount={humanDecisionCount.data ?? undefined}
          />

          {stats && <FocusStatsSection stats={stats} />}

          {/* 두 열은 같은 높이로 늘어납니다. 높이는 칸 높이를 고정한 왼쪽 열이 정하고, 오른쪽 열은 그 높이를 나눠 씁니다. */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Zone title={text.zones.work}>
              <FocusListSection
                tone={workStateTone("in_progress")}
                title={text.inProgress}
                empty={text.inProgressEmpty}
                items={view.inProgress}
                seeAllView="in_progress"
                box="fixed"
                renderItem={(issue) => (
                  <FocusRow
                    key={issue.id}
                    issue={issue}
                    href={issueHref(issue.id)}
                    waiters={view.waiters.get(issue.id) ?? 0}
                    showAssignee
                  />
                )}
              />
              <FocusListSection
                tone={workStateTone("ready")}
                title={text.nextUp}
                empty={text.readyEmpty}
                items={view.ready}
                seeAllView="ready"
                box="fixed"
                renderItem={(issue) => (
                  <FocusRow
                    key={issue.id}
                    issue={issue}
                    href={issueHref(issue.id)}
                    waiters={view.waiters.get(issue.id) ?? 0}
                  />
                )}
              />
              {deadlines && <DeadlinesSection deadlines={deadlines} waiters={view.waiters} />}
            </Zone>

            <Zone title={text.zones.unblock} fill>
              {bottlenecks && <BottlenecksSection bottlenecks={bottlenecks} box="fill" />}
              <FocusListSection
                tone={workStateTone("blocked")}
                title={messages.workStates.labels.blocked}
                empty={text.blockedEmpty}
                items={view.blocked}
                seeAllView="blocked"
                box="fill"
                renderItem={(issue) => (
                  <FocusRow
                    key={issue.id}
                    issue={issue}
                    href={issueHref(issue.id)}
                    waiters={view.waiters.get(issue.id) ?? 0}
                    waitingOn={blockersOf(issue.blockedBy ?? [], gateTitles, (id) =>
                      titles.get(id),
                    )}
                    stacked
                  />
                )}
              />
            </Zone>
          </div>

          {/* 에픽은 따로 읽으므로, 다 읽기 전에 "에픽이 없다"는 안내가 잠깐 보이지 않게 합니다. */}
          {epics.data && (
            <FocusListSection
              title={text.epicProgress}
              empty={text.epicsEmpty}
              items={view.openEpics}
              renderItem={(summary) => <EpicProgressRow key={summary.epic.id} summary={summary} />}
            />
          )}
        </>
      )}

      <IssueDetailRoute />
    </ScreenFrame>
  );
}

type ZoneProps = {
  title: string;
  /** 넓은 창에서 내용과 관계없이 같은 행의 다른 열 높이에 맞춥니다. 안의 구역은 listBox "fill"로 그 높이를 나눠 씁니다. */
  fill?: boolean;
  children: ReactNode;
};

/** 화면을 나누는 큰 구역입니다. */
function Zone({ title, fill, children }: ZoneProps) {
  return (
    <section aria-label={title} className={`min-w-0 ${fill ? "lg:relative" : ""}`}>
      <div className={`flex flex-col gap-6 ${fill ? "lg:absolute lg:inset-0" : ""}`}>
        <p className="px-1 text-xs font-semibold tracking-wide text-emphasis-60">{title}</p>
        {children}
      </div>
    </section>
  );
}

type SummaryChipsProps = {
  view: FocusView;
  stats: FocusStats | null;
  deadlines: FocusDeadlines | null;
  humanDecisionCount: number | undefined;
};

/** 요약 칩의 모양입니다. 일반 칩(.chip)보다 커서 그 class를 쓰지 않고, 색만 .tone-fill로 칩과 맞춥니다. */
const SUMMARY_CHIP_SHAPE =
  "flex h-10 items-center gap-3 rounded-full px-4 text-sm font-semibold whitespace-nowrap";

/** 화면이 다루는 개수를 칩 한 줄로 보입니다. 기한 초과나 오늘 마감이 있으면 같은 줄 끝에 경고로 붙입니다. */
function SummaryChips({ view, stats, deadlines, humanDecisionCount }: SummaryChipsProps) {
  const messages = useMessages();
  const countOf = { in_progress: view.inProgress, ready: view.ready, blocked: view.blocked };
  const warnings = deadlines
    ? [
        { label: messages.focus.deadlines.overdue, count: deadlines.overdue.length },
        { label: messages.focus.deadlines.dueToday, count: deadlines.dueToday.length },
      ].filter(({ count }) => count > 0)
    : [];
  // 경고 칩이 없을 때도 그 이름을 넣어 두어, 경고가 생기거나 사라져도 칩 너비가 바뀌지 않게 합니다.
  const labels = [
    ...CHIP_STATES.map((state) => messages.workStates.labels[state]),
    messages.humanDecisions.title,
    messages.workStates.labels.deferred,
    messages.focus.stats.closableEpics,
    messages.focus.deadlines.overdue,
    messages.focus.deadlines.dueToday,
  ];
  return (
    <nav aria-label={messages.focus.summary} className="flex flex-wrap gap-2">
      {CHIP_STATES.map((state) => (
        <SummaryChip
          key={state}
          href={issueViewHref(state)}
          tone={workStateTone(state)}
          label={messages.workStates.labels[state]}
          count={countOf[state].length}
          labels={labels}
        />
      ))}
      <SummaryChip
        href="/human"
        tone={HUMAN_DECISION_TONE}
        label={messages.humanDecisions.title}
        count={humanDecisionCount}
        labels={labels}
      />
      {stats && (
        <>
          <SummaryChip
            href={issueViewHref("deferred")}
            tone={workStateTone("deferred")}
            label={messages.workStates.labels.deferred}
            count={stats.deferred}
            labels={labels}
          />
          <SummaryChip
            href="/hygiene"
            tone={screenTone("/hygiene")}
            label={messages.focus.stats.closableEpics}
            count={stats.closableEpics}
            labels={labels}
          />
        </>
      )}
      {warnings.map(({ label, count }) => (
        <a
          key={label}
          href={`#${DEADLINES_ID}`}
          className={`${SUMMARY_CHIP_SHAPE} text-error ring-1 ring-error/50 hover:bg-error/10`}
        >
          <SummaryChipBody label={label} count={count} labels={labels} />
        </a>
      ))}
    </nav>
  );
}

type SummaryChipProps = {
  /** workspace 안의 화면 경로입니다. */
  href: string;
  tone: string;
  label: string;
  count: number | undefined;
  /** 요약 칩 줄에 놓이는 모든 칩의 이름입니다. 칩 너비를 이 가운데 가장 긴 이름에 맞춥니다. */
  labels: string[];
};

/** 누르면 개수에 해당하는 이슈를 모아 보는 화면으로 이동합니다. */
function SummaryChip({ href, tone, ...body }: SummaryChipProps) {
  const workspaceHref = useWorkspaceHref();
  return (
    <Link
      href={workspaceHref(href)}
      className={`tone-fill ${tone} ${SUMMARY_CHIP_SHAPE} transition hover:shadow-sm`}
    >
      <SummaryChipBody {...body} />
    </Link>
  );
}

/**
 * 칩의 이름과 개수입니다. 모든 칩이 같은 너비가 되도록, 이름 칸에 줄의 모든 칩 이름을 보이지 않게 겹쳐 두어 가장 긴 이름의 폭을 차지하게 합니다.
 * 그래서 화면 언어가 바뀌면 너비도 그 언어의 가장 긴 이름에 맞춰집니다. 개수 칸은 세 자리 수 폭을 미리 잡아 둡니다.
 */
function SummaryChipBody({ label, count, labels }: Omit<SummaryChipProps, "href" | "tone">) {
  return (
    <>
      <span className="grid">
        <span className="[grid-area:1/1]">{label}</span>
        {labels.map((sizer) => (
          <span key={sizer} aria-hidden className="invisible [grid-area:1/1]">
            {sizer}
          </span>
        ))}
      </span>
      <span className="min-w-[3ch] text-right font-mono text-base tabular-nums">{count}</span>
    </>
  );
}

function EpicProgressRow({
  summary: { epic, totalChildren, closedChildren, inProgressChildren },
}: {
  summary: EpicSummary;
}) {
  const messages = useMessages();
  const issueHref = useIssueHref();
  return (
    <li>
      <Link
        href={issueHref(epic.id)}
        scroll={false}
        className="flex flex-col gap-1.5 px-4 py-3 text-sm hover:bg-base-200/60"
      >
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 grow truncate font-medium">
            {epic.title || messages.common.untitled}
          </span>
          <span className="font-mono text-xs text-emphasis-60 tabular-nums">
            {closedChildren}/{totalChildren}
          </span>
        </span>
        <EpicProgressBar
          epicId={epic.id}
          className="w-full"
          style={
            {
              "--color-progress":
                "color-mix(in oklab, var(--color-sage), var(--color-progress-ink) 25%)",
            } as CSSProperties
          }
          closed={closedChildren}
          inProgress={inProgressChildren}
          total={totalChildren}
          aria-label={messages.focus.epicProgressOf(epic.title)}
        />
      </Link>
    </li>
  );
}

type DeadlinesSectionProps = {
  deadlines: FocusDeadlines;
  waiters: ReadonlyMap<string, number>;
};

type DeadlineGroup = { title: string; basis: string; issues: DatedIssue[]; overdue: boolean };

/**
 * 기한 초과, 오늘 마감, 마감 임박 가운데 이슈가 있는 묶음만 날짜 기준과 함께 보입니다.
 * 모든 묶음이 비면 세 묶음의 날짜 기준을 담은 한 줄 안내만 보입니다.
 */
function DeadlinesSection({ deadlines, waiters }: DeadlinesSectionProps) {
  const messages = useMessages();
  const locale = useLocale();
  const text = messages.focus.deadlines;
  const today = dayLabel(locale, deadlines.today);
  const soon = dayRangeLabel(locale, deadlines.soon.from, deadlines.soon.to);
  const groups: DeadlineGroup[] = [
    { title: text.overdue, basis: text.overdueBasis, issues: deadlines.overdue, overdue: true },
    { title: text.dueToday, basis: today, issues: deadlines.dueToday, overdue: false },
    { title: text.dueSoon(DUE_SOON_DAYS), basis: soon, issues: deadlines.dueSoon, overdue: false },
  ].filter(({ issues }) => issues.length > 0);
  const total = groups.reduce((sum, { issues }) => sum + issues.length, 0);
  const { box } = listBoxClasses("fixed");
  return (
    <section id={DEADLINES_ID} aria-label={text.title} className="flex scroll-mt-4 flex-col gap-2">
      <GroupHeading title={text.title} count={total} />
      {groups.length === 0 ? (
        <p
          className={`surface flex flex-col items-center justify-center gap-1 px-4 py-3 text-center text-xs text-emphasis-60 ${box}`}
        >
          {text.none(DUE_SOON_DAYS)}
          <span className="text-emphasis-50">{text.noneBasis(today, DUE_SOON_DAYS, soon)}</span>
        </p>
      ) : (
        <div
          className={`surface focus-scroll-shadow flex flex-col divide-y divide-base-300 ${box}`}
        >
          {groups.map((group) => (
            <DeadlineGroupList key={group.title} group={group} waiters={waiters} />
          ))}
        </div>
      )}
    </section>
  );
}

function DeadlineGroupList({
  group: { title, basis, issues, overdue },
  waiters,
}: {
  group: DeadlineGroup;
  waiters: ReadonlyMap<string, number>;
}) {
  const issueHref = useIssueHref();
  const { shown, action } = useListLimit(issues);
  return (
    <section aria-label={title} className="flex flex-col">
      <h3 className="flex flex-wrap items-baseline gap-x-2 px-4 py-2.5 text-xs font-semibold">
        {title}
        <span className="font-normal text-emphasis-60">{basis}</span>
        <span className="font-mono font-normal text-emphasis-50 tabular-nums">{issues.length}</span>
        <span className="ml-auto font-normal">{action}</span>
      </h3>
      <ul className="flex flex-col divide-y divide-base-300 border-t border-base-300">
        {shown.map((issue) => (
          <FocusRow
            key={issue.id}
            issue={issue}
            href={issueHref(issue.id)}
            waiters={waiters.get(issue.id) ?? 0}
            due={{ at: issue.dueAt, overdue }}
          />
        ))}
      </ul>
    </section>
  );
}

const DAY_FORMAT: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", weekday: "short" };

/** "YYYY-MM-DD" 현지 날짜를 월, 일, 요일로 보입니다. */
function dayLabel(locale: Locale, day: string): string {
  return localDate(day).toLocaleDateString(locale, DAY_FORMAT);
}

function dayRangeLabel(locale: Locale, from: string, to: string): string {
  return new Intl.DateTimeFormat(locale, DAY_FORMAT).formatRange(localDate(from), localDate(to));
}

type RowProps = {
  issue: Issue;
  href: string;
  /** 이 이슈가 닫히기를 기다리는 이슈 수입니다. */
  waiters: number;
  showAssignee?: boolean;
  /** 마감 목록의 행이면 마감 시각을 보이고, 기한 초과면 강조합니다. */
  due?: { at: number; overdue: boolean };
  /** 막힌 이슈가 기다리는 이슈를 한 줄씩 보입니다. human gate는 사람 확인 기다림 표시와 gate 제목으로 보입니다. */
  waitingOn?: Blocker[];
  /** 좁은 열에서 제목이 잘리지 않도록, 제목 줄에는 유형과 ID만 두고 나머지 표시를 다음 줄로 내립니다. */
  stacked?: boolean;
};

function FocusRow({ issue, href, waiters, showAssignee, due, waitingOn, stacked }: RowProps) {
  const messages = useMessages();
  const locale = useLocale();
  const title = issue.title || messages.common.untitled;
  const idButton = (
    <CoveredIssueIdButton
      issueId={issue.id}
      short
      className="ml-auto min-w-8 shrink-0 rounded text-right text-xs whitespace-nowrap text-emphasis-50"
    />
  );
  const signals = (
    <>
      <HumanDecisionChip issue={issue} />
      <WaiterCount count={waiters} className="relative" />
      {/* 바로 앞의 대기 수와 이어 "1개 대기 없음"처럼 읽히지 않도록 담당자 앞에 아이콘을 붙입니다.
          칸 폭을 고정하면 우선순위와 멀어지고 제목이 쓸 폭이 줄어들므로, 글자와 아이콘만큼만 차지하게 둡니다. */}
      {showAssignee && (
        <span
          className="relative flex max-w-36 shrink-0 items-center gap-0.5 text-xs text-emphasis-60"
          title={`${messages.issue.assignee}: ${issue.assignee ?? messages.common.none}`}
        >
          <UserIcon className="size-3 shrink-0" />
          <span className="sr-only">{messages.issue.assignee}</span>
          <span className="truncate">{issue.assignee ?? messages.common.none}</span>
        </span>
      )}
      {issue.priority !== null && <PriorityChip priority={issue.priority} />}
      {due && (
        <span
          className={`shrink-0 text-xs tabular-nums ${due.overdue ? "font-semibold text-error" : "text-emphasis-60"}`}
        >
          <span className="sr-only">{messages.issue.dueAt}</span>
          {dueAtLabel(locale, due.at)}
        </span>
      )}
    </>
  );
  return (
    <CoveredIssueRow
      as="li"
      className="flex flex-col gap-1 px-4 py-3 text-sm hover:bg-base-200/60"
      issueId={issue.id}
      title={title}
      cover={{ href }}
    >
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap">
        <span className="w-16 shrink-0 text-xs">
          <IssueTypeTag issueType={issue.issueType} />
        </span>
        <span className="min-w-0 grow basis-[calc(100%-5rem)] truncate font-medium sm:basis-0">
          {title}
        </span>
        {!stacked && signals}
        {idButton}
      </span>
      {stacked && (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-19 empty:hidden">
          {signals}
        </span>
      )}
      {waitingOn && waitingOn.length > 0 && <WaitingOnLines blockers={waitingOn} />}
    </CoveredIssueRow>
  );
}
