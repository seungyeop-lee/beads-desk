"use client";

import { awaitingHuman, type Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useHumanGates } from "@/client/modules/humanGates/application/useHumanGates";
import { useIssueDetail } from "@/client/modules/issues/application/useIssueDetail";
import { useIssueList } from "@/client/modules/issues/application/useIssueList";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import type { HumanGateSummary } from "@/shared/contract/humanGates";
import { ALL_STATUSES } from "@/shared/contract/issueList";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { MarkdownEditor } from "@/client/ui/designSystem/MarkdownEditor";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { HumanDecisionPanel } from "@/client/ui/issues/detail/HumanDecisionPanel";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { priorityLabel, priorityTone } from "@/client/ui/issues/issueLabels";
import { IssueTypeTag } from "@/client/ui/issues/IssueTypeTag";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HumanGateDecision } from "./HumanGateDecision";

/** 왼쪽 목록의 한 줄입니다. human gate는 막고 있는 작업과 함께, 질문은 이슈 하나로 보입니다. */
type PendingItem =
  | { kind: "gate"; id: string; summary: HumanGateSummary }
  | { kind: "question"; id: string; issue: Issue };

/**
 * 판단을 기다리는 human gate와 질문을 왼쪽에 확인 요청과 질문 묶음으로 나눠 보이고, 고른 항목의 내용을 읽으며 오른쪽에서 바로 처리합니다.
 * 비어 있는 묶음은 숨깁니다.
 */
export function HumanDecisionsScreen() {
  const { data: issues, error, loading } = useIssueList(ALL_STATUSES);
  const { data: gates, error: gatesError, loading: gatesLoading } = useHumanGates();
  const messages = useMessages();
  // 한쪽만 먼저 보이면 고른 항목이 다른 쪽이 도착할 때 바뀌므로, gate 조회가 끝난 뒤(실패 포함) 함께 보입니다.
  const loaded = issues !== null && (gates !== null || gatesError !== null);
  const awaiting = useMemo(() => awaitingHuman(gates ?? [], issues ?? []), [gates, issues]);
  const pending = useMemo(
    (): PendingItem[] => [
      ...awaiting.gates.map((summary) => ({ kind: "gate" as const, id: summary.gate.id, summary })),
      ...awaiting.questions.map((issue) => ({ kind: "question" as const, id: issue.id, issue })),
    ],
    [awaiting],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 처리해 닫힌 항목은 목록에서 빠지므로, 고른 항목이 없어지면 맨 위 항목을 이어서 보여 줍니다.
  const selected = pending.find((item) => item.id === selectedId) ?? pending[0];
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
    <main className="mx-auto flex max-w-[96rem] flex-col gap-6 px-8 pb-16">
      <ScreenHeader
        title={messages.humanDecisions.title}
        tone={screenTone("/human")}
        count={loaded ? awaiting.count : undefined}
        loading={loading || gatesLoading}
        description={messages.humanDecisions.description}
      />

      {/* bd 실행 자체가 실패하면 두 조회가 같은 오류를 받으므로 한 번만 보입니다. */}
      {[...new Set([error, gatesError])].map(
        (message) =>
          message && (
            <div key={message} role="alert" className="alert alert-error alert-soft">
              <span>{messages.issues.loadFailed(message)}</span>
            </div>
          ),
      )}

      {loaded &&
        (selected ? (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="flex flex-col gap-5">
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
                          onSelect={() => setSelectedId(item.id)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            {selected.kind === "gate" ? (
              <HumanGateDecision key={selected.id} summary={selected.summary} />
            ) : (
              <SelectedDecision key={selected.id} issueId={selected.id} />
            )}
          </div>
        ) : (
          <EmptyState message={messages.humanDecisions.empty} />
        ))}

      <IssueDetailRoute />
    </main>
  );
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
  const [firstBlocked, ...restBlocked] = item.kind === "gate" ? item.summary.blocks : [];
  return (
    <button
      type="button"
      aria-current={current ? "true" : undefined}
      className="flex min-w-0 w-full flex-col gap-1 px-4 py-3 text-left text-sm hover:bg-base-200/60 aria-[current=true]:bg-base-300/60"
      onClick={onSelect}
    >
      <span className="flex w-full flex-wrap items-center gap-2">
        <span className="w-16 shrink-0 text-xs">
          <IssueTypeTag issueType={issue.issueType} />
        </span>
        <span className="order-first w-full font-medium wrap-anywhere">
          {issue.title || messages.common.untitled}
        </span>
        {issue.priority !== null && (
          <span className={`chip h-5 px-2 text-[11px] ${priorityTone(issue.priority)}`}>
            P{issue.priority} {priorityLabel(messages, issue.priority)}
          </span>
        )}
        <span className="ml-auto shrink-0 text-right font-mono text-xs text-base-content/45">
          {issue.id}
        </span>
      </span>
      {firstBlocked && (
        <span className="wrap-anywhere text-xs text-base-content/60">
          ← {firstBlocked.title || messages.common.untitled}
          {restBlocked.length > 0 && ` ${messages.blocking.more(restBlocked.length)}`}
        </span>
      )}
    </button>
  );
}

function SelectedDecision({ issueId }: { issueId: string }) {
  const { data: issue, error } = useIssueDetail(issueId);
  const writes = useIssueWrites();
  const issueHref = useIssueHref();
  const messages = useMessages();
  if (error) {
    return (
      <div role="alert" className="alert alert-error alert-soft">
        <span>{messages.issueDetail.loadFailed(error)}</span>
      </div>
    );
  }
  if (!issue) {
    return (
      <span
        className="loading loading-spinner loading-sm text-base-content/40"
        aria-label={messages.issueDetail.loading}
      />
    );
  }
  return (
    <section className="surface min-w-0 flex flex-col gap-5 p-6" aria-label={issue.title}>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <IssueTypeTag issueType={issue.issueType} />
          <span className="font-mono text-base-content/55">{issue.id}</span>
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
      <HumanDecisionPanel issue={issue} writes={writes} />
    </section>
  );
}
