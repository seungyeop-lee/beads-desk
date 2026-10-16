"use client";

import type { Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { useEpics } from "@/client/modules/epics/application/useEpics";
import { focusStats } from "@/client/modules/focus/domain/focusStats";
import { focusView, NEXT_UP_LIMIT } from "@/client/modules/focus/domain/focusView";
import { useHumanGates } from "@/client/modules/humanGates/application/useHumanGates";
import {
  blockersOf,
  humanGateTitles,
  type Blocker,
} from "@/client/modules/humanGates/domain/humanGateBlockers";
import { useIssueList } from "@/client/modules/issues/application/useIssueList";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import type { WorkState } from "@/client/modules/issues/domain/workState";
import type { IssueListFilter } from "@/shared/contract/issueList";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import {
  HUMAN_DECISION_TONE,
  priorityLabel,
  priorityTone,
  workStateTone,
} from "@/client/ui/issues/issueLabels";
import { HumanDecisionChip } from "@/client/ui/issues/HumanDecisionChip";
import { HumanGateChip } from "@/client/ui/issues/HumanGateChip";
import { IssueTypeTag } from "@/client/ui/issues/IssueTypeTag";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { issueViewHref } from "@/client/ui/screens/issues/issueListAddress";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { FocusStatsSection } from "./FocusStatsSection";
import { useMinuteClock } from "@/client/ui/screens/board/useMinuteClock";

const ALL_STATUSES: IssueListFilter = { kind: "status", statuses: [] };

/** 개수 카드로 보이는 작업 상태입니다. 누르면 이슈 목록의 같은 보기 탭으로 이동합니다. */
const CARD_STATES = ["in_progress", "ready", "blocked"] as const satisfies WorkState[];

/**
 * 첫 화면입니다. 위쪽 개수 카드와 흐름 통계, 왼쪽의 진행 중과 다음에 할 일, 오른쪽의 막힘과 에픽 진행률을 보입니다.
 * 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function FocusScreen() {
  const { data: issues, error, loading } = useIssueList(ALL_STATUSES);
  const { data: epics } = useEpics();
  const { data: humanGates } = useHumanGates();
  const issueHref = useIssueHref();
  const messages = useMessages();
  const view = useMemo(
    () => (issues ? focusView(issues, epics ?? [], humanGates ?? []) : null),
    [issues, epics, humanGates],
  );
  const now = useMinuteClock();
  const stats = useMemo(
    () => (issues ? focusStats(issues, epics ?? [], now) : null),
    [issues, epics, now],
  );
  const titles = useMemo(
    () => new Map((issues ?? []).map((issue) => [issue.id, issue.title])),
    [issues],
  );
  const gateTitles = useMemo(() => humanGateTitles(humanGates ?? []), [humanGates]);
  const countOf = { in_progress: view?.inProgress, ready: view?.ready, blocked: view?.blocked };

  return (
    <main className="mx-auto flex max-w-[96rem] flex-col gap-6 px-8 pb-16">
      <ScreenHeader title={messages.focus.title} tone={screenTone("/focus")} loading={loading} />

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>{messages.issues.loadFailed(error)}</span>
        </div>
      )}

      {view && (
        <>
          <div className="grid grid-cols-4 gap-3">
            {CARD_STATES.map((state) => (
              <CountCard
                key={state}
                href={issueViewHref(state)}
                tone={workStateTone(state)}
                label={messages.workStates.labels[state]}
                count={countOf[state]?.length}
              />
            ))}
            <CountCard
              href="/human"
              tone={HUMAN_DECISION_TONE}
              label={messages.humanDecisions.title}
              count={view.awaitingHuman.length}
            />
          </div>

          {stats && <FocusStatsSection stats={stats} />}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-6">
              <FocusSection
                tone={workStateTone("in_progress")}
                title={messages.focus.inProgress}
                empty={messages.focus.inProgressEmpty}
              >
                {view.inProgress.map((issue) => (
                  <FocusRow key={issue.id} issue={issue} href={issueHref(issue.id)} showAssignee />
                ))}
              </FocusSection>
              <FocusSection
                tone={workStateTone("ready")}
                title={messages.focus.nextUp}
                empty={messages.focus.readyEmpty}
                action={
                  view.ready.length > NEXT_UP_LIMIT && (
                    <Link
                      href={issueViewHref("ready")}
                      className="text-xs font-medium hover:underline"
                    >
                      {messages.focus.seeAllReady(view.ready.length)} →
                    </Link>
                  )
                }
              >
                {view.ready.slice(0, NEXT_UP_LIMIT).map((issue) => (
                  <FocusRow key={issue.id} issue={issue} href={issueHref(issue.id)} />
                ))}
              </FocusSection>
            </div>

            <div className="flex flex-col gap-6">
              <FocusSection
                tone={workStateTone("blocked")}
                title={messages.workStates.labels.blocked}
                empty={messages.focus.blockedEmpty}
              >
                {view.blocked.map((issue) => (
                  <FocusRow
                    key={issue.id}
                    issue={issue}
                    href={issueHref(issue.id)}
                    waitingOn={blockersOf(issue.blockedBy ?? [], gateTitles, (id) =>
                      titles.get(id),
                    )}
                  />
                ))}
              </FocusSection>
              {/* 에픽은 따로 읽으므로, 다 읽기 전에 "에픽이 없다"는 안내가 잠깐 보이지 않게 합니다. */}
              {epics && (
                <FocusSection title={messages.focus.epicProgress} empty={messages.focus.epicsEmpty}>
                  {view.openEpics.map(({ epic, totalChildren, closedChildren }) => (
                    <li key={epic.id}>
                      <Link
                        href={issueHref(epic.id)}
                        scroll={false}
                        className="flex flex-col gap-1.5 px-4 py-3 text-sm hover:bg-base-200/60"
                      >
                        <span className="flex items-baseline gap-2">
                          <span className="min-w-0 grow truncate font-medium">
                            {epic.title || messages.common.untitled}
                          </span>
                          <span className="font-mono text-xs text-base-content/55 tabular-nums">
                            {closedChildren}/{totalChildren}
                          </span>
                        </span>
                        <progress
                          className="progress h-1.5 w-full text-[color-mix(in_oklab,var(--color-sage),#3f6212_25%)]"
                          value={closedChildren}
                          max={Math.max(totalChildren, 1)}
                          aria-label={messages.focus.epicProgressOf(epic.title)}
                        />
                      </Link>
                    </li>
                  ))}
                </FocusSection>
              )}
            </div>
          </div>
        </>
      )}

      <IssueDetailRoute />
    </main>
  );
}

type CountCardProps = {
  href: string;
  tone: string;
  label: string;
  count: number | undefined;
};

/** 누르면 개수에 해당하는 이슈를 모아 보는 화면으로 이동합니다. */
function CountCard({ href, tone, label, count }: CountCardProps) {
  return (
    <Link
      href={href}
      className={`tone-wash ${tone} flex flex-col gap-1 rounded-box px-5 py-4 transition hover:shadow-sm`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <span className={`tone-dot ${tone}`} />
        {label}
      </span>
      <span className="font-mono text-3xl font-bold tabular-nums">{count}</span>
    </Link>
  );
}

type SectionProps = {
  title: string;
  /** 제목 앞 점의 색입니다. 없으면 점을 그리지 않습니다. */
  tone?: string;
  empty: string;
  /** 제목 줄 오른쪽에 두는 링크입니다. */
  action?: ReactNode;
  children: ReactNode[];
};

function FocusSection({ title, tone, empty, action, children }: SectionProps) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 px-1 text-[15px] font-bold">
        {tone && <span className={`tone-dot ${tone}`} />}
        {title}
        <span className="ml-auto font-normal">{action}</span>
      </h2>
      {children.length === 0 ? (
        <p className="rounded-box border border-dashed border-base-300 py-6 text-center text-sm text-base-content/50">
          {empty}
        </p>
      ) : (
        <ul className="surface flex flex-col divide-y divide-base-300">{children}</ul>
      )}
    </section>
  );
}

type RowProps = {
  issue: Issue;
  href: string;
  showAssignee?: boolean;
  /** 막힌 이슈가 기다리는 이슈를 한 줄씩 보입니다. human gate는 사람 확인 기다림 표시와 gate 제목으로 보입니다. */
  waitingOn?: Blocker[];
};

function FocusRow({ issue, href, showAssignee, waitingOn }: RowProps) {
  const messages = useMessages();
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        className="flex flex-col gap-1 px-4 py-3 text-sm hover:bg-base-200/60"
      >
        <span className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-xs">
            <IssueTypeTag issueType={issue.issueType} />
          </span>
          <span className="min-w-0 grow truncate font-medium">
            {issue.title || messages.common.untitled}
          </span>
          <HumanDecisionChip issue={issue} />
          {showAssignee && (
            <span className="shrink-0 text-xs text-base-content/60">
              {issue.assignee ?? messages.common.none}
            </span>
          )}
          {issue.priority !== null && (
            <span className={`chip h-5 px-2 text-[11px] ${priorityTone(issue.priority)}`}>
              P{issue.priority} {priorityLabel(messages, issue.priority)}
            </span>
          )}
          <span
            className="w-20 shrink-0 truncate text-right font-mono text-xs text-base-content/45"
            title={issue.id}
          >
            {shortIssueId(issue.id)}
          </span>
        </span>
        {waitingOn?.map((blocker) =>
          blocker.humanGate ? (
            <span
              key={blocker.id}
              className="flex min-w-0 items-center gap-1.5 pl-19 text-xs text-base-content/60"
            >
              ←
              <HumanGateChip />
              <span className="truncate">{blocker.title || messages.common.untitled}</span>
            </span>
          ) : (
            <span key={blocker.id} className="truncate pl-19 text-xs text-base-content/60">
              ← {blocker.id} {blocker.title}
            </span>
          ),
        )}
      </Link>
    </li>
  );
}
