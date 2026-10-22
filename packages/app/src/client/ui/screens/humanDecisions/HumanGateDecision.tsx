"use client";

import { Spinner } from "@/client/ui/designSystem/Spinner";

import type { Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { usePreviousGateRounds } from "@/client/modules/humanGates/application/usePreviousGateRounds";
import { useIssueDetail } from "@/client/modules/issues/application/useIssueDetail";
import { tabMarkdownUrl } from "@/client/modules/markdown/application/markdownAddress";
import type { HumanGateSummary } from "@/shared/contract/humanGates";
import { MarkdownEditor } from "@/client/ui/markdown/MarkdownEditor";
import { CommentTimeline } from "@/client/ui/issues/detail/CommentList";
import { HumanGateResponse } from "@/client/ui/issues/detail/HumanGateResponse";
import { useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { formatTime } from "@/client/ui/issues/issueTime";
import { LabelChip } from "@/client/ui/issues/IssueChip";
import { IssueTypeTag } from "@/client/ui/issues/IssueTypeTag";
import { LoadResult } from "@/client/ui/designSystem/LoadResult";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { HumanDecisionHeading } from "@/client/ui/issues/HumanDecisionHeading";
import { HumanGateReason } from "@/client/ui/issues/detail/HumanGateReason";
import { CopyIssueIdButton } from "@/client/ui/issues/CopyIssueIdButton";

/** 고른 human gate의 사유를 보이고 응답하거나 응답 없이 닫으며, 이전 라운드 피드백은 응답 아래에, 막고 있는 작업은 맨 아래에 보입니다. */
export function HumanGateDecision({ summary }: { summary: HumanGateSummary }) {
  const { gate, reason, blocks } = summary;
  const issueHref = useIssueHref();
  const messages = useMessages();

  return (
    <section className="surface min-w-0 flex flex-col gap-5 p-6" aria-label={gate.title}>
      <HumanDecisionHeading issue={gate} href={issueHref(gate.id)} />
      <HumanGateReason reason={reason} />

      <HumanGateResponse gateId={gate.id} />
      {summary.previousGateCount > 0 && <PreviousGateFeedback gateId={gate.id} />}

      <section className="flex flex-col gap-2 text-sm" aria-label={messages.humanGate.blocks}>
        <h3 className="font-semibold">{messages.humanGate.blocks}</h3>
        <BlockedIssues blocks={blocks} />
      </section>
    </section>
  );
}

/** 같은 작업을 막았던 닫힌 gate(이전 라운드)의 닫은 사유와 코멘트를 라운드 시작 시각이 오래된 순으로 보이고, 같은 초에 시작한 라운드는 gate id 오름차순으로 순서가 정해집니다. */
function PreviousGateFeedback({ gateId }: { gateId: string }) {
  const { data: rounds, error } = usePreviousGateRounds(gateId);
  const locale = useLocale();
  const messages = useMessages();
  const issueHref = useIssueHref();
  return (
    <LoadResult
      state={{ data: rounds && rounds.length > 0 ? rounds : null, error }}
      loadFailed={(failed) => messages.humanGate.previousLoadFailed(failed)}
      waiting={<Spinner size="sm" tone="muted" label={messages.humanGate.previousLoading} />}
    >
      {(rounds) => (
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
                  <h4 className="font-medium">
                    <Link href={issueHref(gate.id)} scroll={false} className="hover:underline">
                      {gate.title || messages.common.untitled}
                    </Link>
                  </h4>
                  <CopyIssueIdButton
                    issueId={gate.id}
                    className="rounded text-xs text-emphasis-50"
                  />
                  {gate.closedAt !== null && (
                    <span className="text-xs text-emphasis-60">
                      {messages.humanGate.roundClosed(formatTime(locale, gate.closedAt))}
                    </span>
                  )}
                </div>
                {gate.labels.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {gate.labels.map((label) => (
                      <li key={label}>
                        <LabelChip label={label} />
                      </li>
                    ))}
                  </ul>
                )}
              </header>
              {comments.length > 0 ? (
                <CommentTimeline comments={comments} />
              ) : (
                closeReason && (
                  <p className="text-emphasis-60">
                    {messages.issueDetail.closeReason}: {closeReason}
                  </p>
                )
              )}
            </article>
          ))}
        </section>
      )}
    </LoadResult>
  );
}

/** 막고 있는 작업이 하나면 설명까지 보이고, 여럿이면 목록만 보입니다. */
function BlockedIssues({ blocks }: { blocks: Issue[] }) {
  const messages = useMessages();
  const [only] = blocks;
  if (!only) {
    return <p className="text-emphasis-60">{messages.humanGate.noBlocks}</p>;
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
      <p className="text-emphasis-60">{messages.humanGate.manyBlocks(blocks.length)}</p>
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
      <CopyIssueIdButton issueId={issue.id} className="shrink-0 rounded text-xs text-emphasis-50" />
    </div>
  );
}

function BlockedIssueDescription({ issueId }: { issueId: string }) {
  const { data: issue, error } = useIssueDetail(issueId);
  const messages = useMessages();
  return (
    <LoadResult
      state={{ data: issue, error }}
      loadFailed={(failed) => messages.issueDetail.loadFailed(failed)}
      waiting={<Spinner size="sm" tone="muted" label={messages.issueDetail.loading} />}
    >
      {(issue) =>
        issue.description ? (
          <MarkdownEditor readOnly openAddress={tabMarkdownUrl} value={issue.description} />
        ) : (
          <p className="text-emphasis-50">{messages.humanDecisions.noDescription}</p>
        )
      }
    </LoadResult>
  );
}
