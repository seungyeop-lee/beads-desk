"use client";

import { awaitsHumanDecision } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useIssueDetail } from "@/client/modules/issues/application/useIssueDetail";
import { useIssueList } from "@/client/modules/issues/application/useIssueList";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
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

const ALL_STATUSES: IssueListFilter = { kind: "status", statuses: [] };

/** 판단을 기다리는 이슈를 왼쪽에 모으고, 고른 이슈의 설명을 읽으며 오른쪽에서 바로 응답하거나 넘깁니다. */
export function HumanDecisionsScreen() {
  const { data: issues, error, loading } = useIssueList(ALL_STATUSES);
  const messages = useMessages();
  const pending = useMemo(() => (issues ?? []).filter(awaitsHumanDecision), [issues]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 응답해 닫힌 이슈는 목록에서 빠지므로, 고른 이슈가 없어지면 맨 위 이슈를 이어서 보여 줍니다.
  const selected = pending.find((issue) => issue.id === selectedId) ?? pending[0];

  return (
    <main className="mx-auto flex max-w-[96rem] flex-col gap-6 px-8 pb-16">
      <ScreenHeader
        title={messages.humanDecisions.title}
        tone={screenTone("/human")}
        count={issues ? pending.length : undefined}
        loading={loading}
        description={messages.humanDecisions.description}
      />

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>{messages.issues.loadFailed(error)}</span>
        </div>
      )}

      {issues &&
        (selected ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ul className="surface flex flex-col divide-y divide-base-300">
              {pending.map((issue) => (
                <li key={issue.id}>
                  <button
                    type="button"
                    aria-current={issue.id === selected.id ? "true" : undefined}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-base-200/60 aria-[current=true]:bg-base-300/60"
                    onClick={() => setSelectedId(issue.id)}
                  >
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
                  </button>
                </li>
              ))}
            </ul>
            <SelectedDecision key={selected.id} issueId={selected.id} />
          </div>
        ) : (
          <EmptyState message={messages.humanDecisions.empty} />
        ))}

      <IssueDetailRoute />
    </main>
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
