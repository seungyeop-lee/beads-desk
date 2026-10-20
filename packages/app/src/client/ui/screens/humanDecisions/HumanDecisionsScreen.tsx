"use client";

import { awaitingHuman, type Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useHumanGates } from "@/client/modules/humanGates/application/useHumanGates";
import { useHumanDecisionCount } from "@/client/modules/humanDecisions/application/useHumanDecisionCount";
import { sortByRequestedAt } from "@/client/modules/humanDecisions/domain/humanDecisionsView";
import { useIssueDetail } from "@/client/modules/issues/application/useIssueDetail";
import { useIssueList } from "@/client/modules/issues/application/useIssueList";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import type { HumanGateSummary } from "@/shared/contract/humanGates";
import { useQueryReplace } from "@/client/ui/address/useQueryReplace";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { LoadResult } from "@/client/ui/designSystem/LoadResult";
import { MarkdownEditor } from "@/client/ui/designSystem/MarkdownEditor";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { FirstBlockedLine } from "@/client/ui/issues/BlockerLine";
import { HumanDecisionPanel } from "@/client/ui/issues/detail/HumanDecisionPanel";
import type { ListedIssues } from "@/client/ui/issues/detail/listedIssues";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { IssueChip, PriorityChip } from "@/client/ui/issues/IssueChip";
import { IssueTypeTag } from "@/client/ui/issues/IssueTypeTag";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HumanGateDecision } from "./HumanGateDecision";
import { CopyIssueIdButton } from "@/client/ui/issues/CopyIssueIdButton";
import { CoveredIssueIdButton, CoveredIssueRow } from "@/client/ui/issues/CoveredIssueRow";

/** 왼쪽 목록에서 고른 항목 id를 담는 query 이름입니다. 주소에 남겨 새로고침하거나 주소를 다시 열어도 같은 항목을 보입니다. */
const ITEM_PARAM = "item";

/** 왼쪽 목록의 한 줄입니다. human gate는 막고 있는 작업과 함께, 질문은 이슈 하나로 보입니다. */
type PendingItem =
  | { kind: "gate"; id: string; summary: HumanGateSummary }
  | { kind: "question"; id: string; issue: Issue };

/**
 * 판단을 기다리는 human gate와 질문을 왼쪽에 확인 요청과 질문 묶음으로 나눠 보이고, 고른 항목의 내용을 읽으며 오른쪽에서 바로 처리합니다.
 * 오른쪽에 보이는 항목을 주소 query가 항상 가리켜 새로고침해도 유지되고, 비어 있는 묶음은 숨깁니다.
 */
export function HumanDecisionsScreen() {
  const { data: issues, error, loading } = useIssueList();
  const { data: gates, error: gatesError, loading: gatesLoading } = useHumanGates();
  const humanDecisionCount = useHumanDecisionCount();
  const messages = useMessages();
  // 한쪽만 먼저 보이면 고른 항목이 다른 쪽이 도착할 때 바뀌므로, gate 조회가 끝난 뒤(실패 포함) 함께 보입니다.
  const loaded = issues !== null && (gates !== null || gatesError !== null);
  const awaiting = useMemo(
    () => sortByRequestedAt(awaitingHuman(gates ?? [], issues ?? [])),
    [gates, issues],
  );
  const pending = useMemo(
    (): PendingItem[] => [
      ...awaiting.gates.map((summary) => ({ kind: "gate" as const, id: summary.gate.id, summary })),
      ...awaiting.questions.map((issue) => ({ kind: "question" as const, id: issue.id, issue })),
    ],
    [awaiting],
  );
  const listedIssues: ListedIssues = useMemo(
    () =>
      new Map(
        pending.map((item) => [item.id, item.kind === "gate" ? item.summary.gate : item.issue]),
      ),
    [pending],
  );
  const replaceQuery = useQueryReplace();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get(ITEM_PARAM);
  // 처리해 닫힌 항목은 목록에서 빠지므로, 고른 항목이 없어지면 맨 위 항목을 이어서 보여 줍니다.
  const selected = pending.find((item) => item.id === selectedId) ?? pending[0];
  const select = (id: string) => {
    replaceQuery((params) => params.set(ITEM_PARAM, id));
  };
  const mainRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // 직전에 오른쪽에 보인 항목 id입니다. 주소가 가리키는 항목을 보이다가 그 항목이 목록에서 빠진 경우만 골라 스크롤하려고 둡니다.
  const shownIdRef = useRef<string | null>(null);
  const stopFollowingRef = useRef<(() => void) | null>(null);
  // 주소가 오른쪽에 보이는 항목과 어긋나면 고칩니다. 처음 진입해 맨 위 항목을 자동으로 보일 때와, 고른 항목이 닫혀 다른 항목으로 넘어갈 때입니다. 조회가 끝나기 전에는 목록이 비어 있을 뿐이므로 loaded일 때만 고칩니다.
  useEffect(() => {
    if (!loaded) return;
    const shownClosed =
      shownIdRef.current !== null &&
      shownIdRef.current === selectedId &&
      selected?.id !== selectedId;
    shownIdRef.current = selected?.id ?? null;
    if (selectedId === (selected?.id ?? null)) return;
    replaceQuery((params) => {
      if (selected) params.set(ITEM_PARAM, selected.id);
      else params.delete(ITEM_PARAM);
    });
    // 보던 항목이 닫혀 다음 항목으로 넘어가면 화면이 같은 위치에 머물러 바뀐 것을 알아보기 어려우므로, 새 항목의 시작으로 스크롤합니다.
    if (shownClosed && mainRef.current && listRef.current && panelRef.current) {
      stopFollowingRef.current?.();
      stopFollowingRef.current = keepPanelStartInView(
        mainRef.current,
        listRef.current,
        panelRef.current,
      );
    }
  }, [selectedId, loaded, selected, replaceQuery]);
  useEffect(() => () => stopFollowingRef.current?.(), []);
  const groups = [
    {
      label: messages.humanDecisions.gates,
      items: pending.filter((item) => item.kind === "gate"),
    },
    {
      label: messages.humanDecisions.questions,
      items: pending.filter((item) => item.kind === "question"),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <main ref={mainRef} className="mx-auto flex max-w-[96rem] flex-col gap-6 px-8 pb-16">
      <ScreenHeader
        title={messages.humanDecisions.title}
        tone={screenTone("/human")}
        count={humanDecisionCount.data ?? undefined}
        loading={loading || gatesLoading}
        help={messages.humanDecisions.description}
      />

      {/* bd 실행 자체가 실패하면 두 조회가 같은 오류를 받으므로 한 번만 보입니다. */}
      {[...new Set([error, gatesError])].map(
        (message) =>
          message && <ErrorAlert key={message}>{messages.issues.loadFailed(message)}</ErrorAlert>,
      )}

      {loaded &&
        (selected ? (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div ref={listRef} className="flex flex-col gap-5">
              {groups.map((group) => (
                <section key={group.label} aria-label={group.label} className="flex flex-col gap-2">
                  <h2 className="flex items-baseline gap-2 px-1 text-[15px] font-bold">
                    {group.label}
                    <span className="font-mono text-xs font-normal text-base-content/50">
                      {group.items.length}
                    </span>
                  </h2>
                  <ul className="surface flex flex-col divide-y divide-base-300">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <PendingRow
                          item={item}
                          current={item.id === selected.id}
                          onSelect={() => select(item.id)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <div ref={panelRef} className="min-w-0">
              {selected.kind === "gate" ? (
                <HumanGateDecision key={selected.id} summary={selected.summary} />
              ) : (
                <SelectedDecision key={selected.id} question={selected.issue} />
              )}
            </div>
          </div>
        ) : (
          <EmptyState message={messages.humanDecisions.empty} />
        ))}

      <IssueDetailRoute listedIssues={listedIssues} />
    </main>
  );
}

/** 좁은 폭에서 스크롤한 뒤 상단 머리글과 패널 사이에 두는 간격(px)입니다. 목록과 패널 사이 간격(gap-6)과 같게 둡니다. */
const PANEL_SCROLL_GAP = 24;

/** 사용자가 스크롤하거나 누르거나 키를 누르면, 그 뒤로는 패널 위치를 다시 맞추지 않습니다. */
const USER_SCROLL_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

/**
 * 오른쪽 패널의 시작이 보이게 페이지를 스크롤하고, 돌려준 함수를 부르거나 사용자가 화면을 움직일 때까지 패널 크기가 바뀔 때마다 다시 맞춥니다.
 * 새 항목의 상세와 본문은 패널이 그려진 뒤에 도착하므로, 처음 맞출 때는 페이지가 짧아 원하는 위치까지 스크롤되지 않을 수 있습니다.
 */
function keepPanelStartInView(main: HTMLElement, list: HTMLElement, panel: HTMLElement) {
  const observer = new ResizeObserver(() => scrollToPanelStart(main, list, panel));
  const stop = () => {
    observer.disconnect();
    for (const type of USER_SCROLL_EVENTS)
      window.removeEventListener(type, stop, { capture: true });
  };
  observer.observe(panel);
  for (const type of USER_SCROLL_EVENTS) window.addEventListener(type, stop, { capture: true });
  return stop;
}

/**
 * 넓은 폭에서는 패널이 목록 옆에 놓이므로 페이지 맨 위로 올립니다.
 * 좁은 폭에서는 패널이 목록 아래에 놓여 맨 위로 올리면 목록만 보이므로, 패널 맨 위가 상단 머리글 바로 아래에 오게 합니다.
 * main은 상단 머리글(AppHeader) 바로 아래에서 시작하므로, main 맨 위에서 패널까지의 거리만큼 스크롤하면 패널이 머리글 높이만큼 아래에 놓여 sticky 머리글에 가리지 않습니다.
 */
function scrollToPanelStart(main: HTMLElement, list: HTMLElement, panel: HTMLElement) {
  const panelTop = panel.getBoundingClientRect().top;
  const besideList = panelTop <= list.getBoundingClientRect().top;
  window.scrollTo({
    top: besideList ? 0 : panelTop - main.getBoundingClientRect().top - PANEL_SCROLL_GAP,
  });
}

function PendingRow({
  item,
  current,
  onSelect,
}: {
  item: PendingItem;
  current: boolean;
  onSelect: () => void;
}) {
  const messages = useMessages();
  const issue = item.kind === "gate" ? item.summary.gate : item.issue;
  const title = issue.title || messages.common.untitled;
  return (
    <CoveredIssueRow
      className={`flex min-w-0 w-full flex-col gap-1 px-4 py-3 text-sm ${current ? "bg-base-300/60" : "hover:bg-base-200/60"}`}
      issueId={issue.id}
      title={title}
      cover={{ onSelect }}
      current={current}
    >
      <span className="flex w-full flex-wrap items-center gap-2">
        <span className="w-16 shrink-0 text-xs">
          <IssueTypeTag issueType={issue.issueType} />
        </span>
        <span className="order-first w-full font-medium wrap-anywhere">{title}</span>
        {issue.priority !== null && <PriorityChip priority={issue.priority} />}
        {item.kind === "gate" && item.summary.previousGateCount > 0 && (
          <IssueChip aria-label={messages.humanGate.previousRounds(item.summary.previousGateCount)}>
            🕘 {item.summary.previousGateCount}
          </IssueChip>
        )}
        <CoveredIssueIdButton
          issueId={issue.id}
          className="ml-auto shrink-0 rounded text-right text-xs text-base-content/45"
        />
      </span>
      {item.kind === "gate" && <FirstBlockedLine blocks={item.summary.blocks} />}
    </CoveredIssueRow>
  );
}

function SelectedDecision({ question }: { question: Issue }) {
  const { data: issue, error } = useIssueDetail(question.id);
  const writes = useIssueWrites();
  const issueHref = useIssueHref();
  const messages = useMessages();
  return (
    <LoadResult
      state={{ data: issue, error }}
      loadFailed={(failed) => messages.issueDetail.loadFailed(failed)}
      waiting={
        <span
          className="loading loading-spinner loading-sm text-base-content/40"
          aria-label={messages.issueDetail.loading}
        />
      }
    >
      {(issue) => (
        <section className="surface min-w-0 flex flex-col gap-5 p-6" aria-label={issue.title}>
          <header className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <IssueTypeTag issueType={issue.issueType} />
              <CopyIssueIdButton issueId={issue.id} className="rounded text-base-content/55" />
              <Link
                href={issueHref(issue.id)}
                scroll={false}
                className="ml-auto font-medium hover:underline"
              >
                {messages.humanDecisions.openDetail} →
              </Link>
            </div>
            <h2 className="text-xl leading-snug font-bold">
              {issue.title || messages.common.untitled}
            </h2>
          </header>
          {issue.description ? (
            <div className="text-sm">
              <MarkdownEditor readOnly value={issue.description} />
            </div>
          ) : (
            <p className="text-sm text-base-content/50">{messages.humanDecisions.noDescription}</p>
          )}
          <WriteErrorAlert writes={writes} />
          {/* 응답 패널은 상세가 아니라 목록의 이슈로 보일지 정합니다. 패널이 사라질 때 응답·닫기 알림이 뜨므로, 상세 조회가 먼저 끝나 닫힌 상태를 받아도 목록에서 행이 빠질 때까지 패널을 남겨 둡니다. */}
          <HumanDecisionPanel issue={question} writes={writes} />
        </section>
      )}
    </LoadResult>
  );
}
