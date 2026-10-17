"use client";

import type { Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { usePreviousGateRounds } from "@/client/modules/humanGates/application/usePreviousGateRounds";
import { useIssueDetail } from "@/client/modules/issues/application/useIssueDetail";
import type { HumanGateSummary } from "@/shared/contract/humanGates";
import { MarkdownEditor } from "@/client/ui/designSystem/MarkdownEditor";
import { CommentTimeline } from "@/client/ui/issues/detail/CommentList";
import { HumanGateResponse } from "@/client/ui/issues/detail/HumanGateResponse";
import { useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { formatTime, nameTone } from "@/client/ui/issues/issueLabels";
import { IssueTypeTag } from "@/client/ui/issues/IssueTypeTag";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";

/** 고른 human gate의 사유와 막고 있는 작업을 보이고, 응답하거나 응답 없이 닫습니다. */
export function HumanGateDecision({ summary }: { summary: HumanGateSummary }) {
  const { gate, reason, blocks } = summary;
  const issueHref = useIssueHref();
  const messages = useMessages();

  return (
    <section className="surface min-w-0 flex flex-col gap-5 p-6" aria-label={gate.title}>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <IssueTypeTag issueType={gate.issueType} />
          <span className="font-mono text-base-content/55">{gate.id}</span>
          <Link
            href={issueHref(gate.id)}
            scroll={false}
            className="ml-auto font-medium hover:underline"
          >
            {messages.humanDecisions.openDetail} →
          </Link>
        </div>
        <h2 className="text-xl leading-snug font-bold">{gate.title || messages.common.untitled}</h2>
      </header>

      {reason && (
        <section className="flex flex-col gap-1 text-sm" aria-label={messages.humanGate.reason}>
          <h3 className="font-semibold">{messages.humanGate.reason}</h3>
          <MarkdownEditor readOnly value={reason} />
        </section>
      )}

      <section className="flex flex-col gap-2 text-sm" aria-label={messages.humanGate.blocks}>
        <h3 className="font-semibold">{messages.humanGate.blocks}</h3>
        <BlockedIssues blocks={blocks} />
      </section>

      {summary.previousGateCount > 0 && <PreviousGateFeedback gateId={gate.id} />}
      <HumanGateResponse gateId={gate.id} />
    </section>
  );
}

/** 같은 작업을 막았던 닫힌 gate(이전 라운드)의 닫은 사유와 코멘트를 오래된 라운드부터 보입니다. */
function PreviousGateFeedback({ gateId }: { gateId: string }) {
  const { data: rounds, error } = usePreviousGateRounds(gateId);
  const locale = useLocale();
  const messages = useMessages();
  if (error) {
    return (
      <div role="alert" className="alert alert-error alert-soft">
        <span>{messages.humanGate.previousLoadFailed(error)}</span>
      </div>
    );
  }
  if (!rounds || rounds.length === 0) {
    return (
      <span
        className="loading loading-spinner loading-sm text-base-content/40"
        aria-label={messages.humanGate.previousLoading}
      />
    );
  }
  return (
    <section
      className="flex flex-col gap-3 text-sm"
      aria-label={messages.humanGate.previousFeedback}
    >
      <h3 className="font-semibold">{messages.humanGate.previousFeedback}</h3>
      {rounds.map(({ gate, closeReason, comments }) => (
        <article
          key={gate.id}
          className="flex flex-col gap-3 rounded-box border border-base-300 px-4 py-3"
        >
          <header className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <h4 className="font-medium">{gate.title || messages.common.untitled}</h4>
              <span className="font-mono text-xs text-base-content/45">{gate.id}</span>
              {gate.closedAt !== null && (
                <span className="text-xs text-base-content/55">
                  {messages.humanGate.roundClosed(formatTime(locale, gate.closedAt))}
                </span>
              )}
            </div>
            {gate.labels.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {gate.labels.map((label) => (
                  <li key={label} className={`chip h-5 px-2 text-[11px] ${nameTone(label)}`}>
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </header>
          {comments.length > 0 ? (
            <CommentTimeline comments={comments} />
          ) : (
            closeReason && (
              <p className="text-base-content/60">
                {messages.issueDetail.closeReason}: {closeReason}
              </p>
            )
          )}
        </article>
      ))}
    </section>
  );
}

/** 막고 있는 작업이 하나면 설명까지 보이고, 여럿이면 목록만 보입니다. */
function BlockedIssues({ blocks }: { blocks: Issue[] }) {
  const messages = useMessages();
  const [only] = blocks;
  if (!only) {
    return <p className="text-base-content/60">{messages.humanGate.noBlocks}</p>;
  }
  if (blocks.length === 1) {
    return (
      <div className="flex flex-col gap-2 rounded-box border border-base-300 px-4 py-3">
        <BlockedIssueLine issue={only} />
        <BlockedIssueDescription issueId={only.id} />
      </div>
    );
  }
  return (
    <>
      <p className="text-base-content/60">{messages.humanGate.manyBlocks(blocks.length)}</p>
      <ul className="flex flex-col divide-y divide-base-300 rounded-box border border-base-300">
        {blocks.map((issue) => (
          <li key={issue.id} className="px-4 py-2">
            <BlockedIssueLine issue={issue} />
          </li>
        ))}
      </ul>
    </>
  );
}

function BlockedIssueLine({ issue }: { issue: Issue }) {
  const issueHref = useIssueHref();
  const messages = useMessages();
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs">
        <IssueTypeTag issueType={issue.issueType} />
      </span>
      <Link
        href={issueHref(issue.id)}
        scroll={false}
        className="min-w-0 grow truncate font-medium hover:underline"
      >
        {issue.title || messages.common.untitled}
      </Link>
      <span className="shrink-0 font-mono text-xs text-base-content/45">{issue.id}</span>
    </div>
  );
}

function BlockedIssueDescription({ issueId }: { issueId: string }) {
  const { data: issue, error } = useIssueDetail(issueId);
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
  return issue.description ? (
    <MarkdownEditor readOnly value={issue.description} />
  ) : (
    <p className="text-base-content/50">{messages.humanDecisions.noDescription}</p>
  );
}
