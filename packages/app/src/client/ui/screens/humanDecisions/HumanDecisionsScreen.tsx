"use client";

import { awaitsHumanDecision, type Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useHumanGates } from "@/client/modules/humanGates/application/useHumanGates";
import { useIssueDetail } from "@/client/modules/issues/application/useIssueDetail";
import { useIssueList } from "@/client/modules/issues/application/useIssueList";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import type { HumanGateSummary } from "@/shared/contract/humanGates";
import type { IssueListFilter } from "@/shared/contract/issueList";
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

const ALL_STATUSES: IssueListFilter = { kind: "status", statuses: [] };

/** 왼쪽 목록의 한 줄입니다. human gate는 막고 있는 작업과 함께, 질문은 이슈 하나로 보입니다. */
type PendingItem =
  | { kind: "gate"; id: string; summary: HumanGateSummary }
  | { kind: "question"; id: string; issue: Issue };

/** 판단을 기다리는 human gate와 질문을 왼쪽에 모으고, 고른 항목의 내용을 읽으며 오른쪽에서 바로 처리합니다. */
export function HumanDecisionsScreen() {
  const { data: issues, error, loading } = useIssueList(ALL_STATUSES);
  const { data: gates, error: gatesError, loading: gatesLoading } = useHumanGates();
  const messages = useMessages();
  // 한쪽만 먼저 보이면 고른 항목이 다른 쪽이 도착할 때 바뀌므로, gate 조회가 끝난 뒤(실패 포함) 함께 보입니다.
  const loaded = issues !== null && (gates !== null || gatesError !== null);
  const pending = useMemo(
    (): PendingItem[] => [
      ...(gates ?? []).map((summary) => ({ kind: "gate" as const, id: summary.gate.id, summary })),
      ...(issues ?? [])
        .filter(awaitsHumanDecision)
        .map((issue) => ({ kind: "question" as const, id: issue.id, issue })),
    ],
    [gates, issues],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 처리해 닫힌 항목은 목록에서 빠지므로, 고른 항목이 없어지면 맨 위 항목을 이어서 보여 줍니다.
  const selected = pending.find((item) => item.id === selectedId) ?? pending[0];

  return (
    <main className="mx-auto flex max-w-[96rem] flex-col gap-6 px-8 pb-16">
      <ScreenHeader
        title={messages.humanDecisions.title}
        tone={screenTone("/human")}
        count={loaded ? pending.length : undefined}
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
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ul className="surface flex flex-col divide-y divide-base-300">
              {pending.map((item) => (
                <li key={item.id}>
                  <PendingRow
                    item={item}
                    current={item.id === selected.id}
                    onSelect={() => setSelectedId(item.id)}
                  />
                </li>
              ))}
            </ul>
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
      className="flex w-full flex-col gap-1 px-4 py-3 text-left text-sm hover:bg-base-200/60 aria-[current=true]:bg-base-300/60"
      onClick={onSelect}
    >
      <span className="flex w-full items-center gap-3">
        <span className="w-16 shrink-0 text-xs">
          <IssueTypeTag issueType={issue.issueType} />
        </span>
        <span className="min-w-0 grow truncate font-medium">
          {issue.title || messages.common.untitled}
        </span>
        {issue.priority !== null && (
          <span className={`chip h-5 px-2 text-[11px] ${priorityTone(issue.priority)}`}>
            P{issue.priority} {priorityLabel(messages, issue.priority)}
          </span>
        )}
        <span className="w-20 shrink-0 text-right font-mono text-xs text-base-content/45">
          {issue.id}
        </span>
      </span>
      {firstBlocked && (
        <span className="truncate pl-19 text-xs text-base-content/60">
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
    <section className="surface flex flex-col gap-5 p-6" aria-label={issue.title}>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-xs">
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
