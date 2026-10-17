"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { useHygiene, useStaleIssues } from "@/client/modules/hygiene/application/useHygiene";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { showToast } from "@/client/ui/designSystem/Toast";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { closeAsReplacedAction } from "@/server/web/issues/issueActions";
import {
  DEFAULT_STALE_DAYS,
  STALE_DAYS,
  type IssueRef,
  type StaleDays,
} from "@/shared/contract/hygiene";

/**
 * bd의 정리 점검 결과를 점검마다 카드 하나로 보입니다. 이슈를 누르면 상세 dialog가 열립니다.
 * 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function HygieneScreen() {
  const [staleDays, setStaleDays] = useState<StaleDays>(DEFAULT_STALE_DAYS);
  const { data, error, loading } = useHygiene();
  const stale = useStaleIssues(staleDays);
  const writes = useIssueWrites();
  const issueHref = useIssueHref();
  const messages = useMessages();
  const text = messages.hygiene;

  const closeAsDuplicate = async (duplicate: IssueRef, canonical: IssueRef) => {
    if (!window.confirm(messages.closeAsReplaced.confirm.duplicate(duplicate.id, canonical.id))) {
      return;
    }
    const result = await writes.run(() =>
      closeAsReplacedAction(duplicate.id, "duplicate", canonical.id),
    );
    if (result.ok) showToast(messages.closeAsReplaced.closed.duplicate(duplicate.id, canonical.id));
  };

  const issueRow = (issue: IssueRef, detail?: ReactNode) => (
    <li key={issue.id}>
      <IssueLink issue={issue} href={issueHref(issue.id)} detail={detail} />
    </li>
  );

  return (
    <main className="mx-auto flex max-w-[96rem] flex-col gap-4 px-8 pb-16">
      <ScreenHeader
        title={text.title}
        tone={screenTone("/hygiene")}
        help={text.description}
        loading={loading || stale.loading || writes.pending}
      />

      {/* 서버에 연결하지 못하면 두 조회가 같은 오류를 내므로 한 번만 보입니다. */}
      {[...new Set([error, stale.error])].map(
        (message) =>
          message && (
            <div key={message} role="alert" className="alert alert-error alert-soft">
              <span>{text.loadFailed(message)}</span>
            </div>
          ),
      )}
      <WriteErrorAlert writes={writes} />

      <div className="grid grid-cols-1 items-start gap-x-6 gap-y-8 lg:grid-cols-2">
        <HygieneCard
          title={text.stale.title}
          hint={text.stale.hint(staleDays)}
          empty={text.stale.empty(staleDays)}
          action={
            <select
              className="select select-sm w-24"
              aria-label={text.stale.days}
              value={staleDays}
              onChange={(event) => setStaleDays(Number(event.target.value) as StaleDays)}
            >
              {STALE_DAYS.map((days) => (
                <option key={days} value={days}>
                  {text.stale.dayOption(days)}
                </option>
              ))}
            </select>
          }
        >
          {stale.data?.map((issue) => issueRow(issue))}
        </HygieneCard>

        <HygieneCard
          title={text.duplicates.title}
          hint={text.duplicates.hint}
          empty={text.duplicates.empty}
        >
          {data?.duplicates.map((pair) => (
            <li key={pair.map((issue) => issue.id).join(" ")} className="flex flex-col gap-1 py-2">
              {pair.map((issue) => (
                <IssueLink key={issue.id} issue={issue} href={issueHref(issue.id)} />
              ))}
              <span className="flex flex-wrap gap-2 px-4 py-1">
                {[pair, pair.toReversed()].map(([duplicate, canonical]) => (
                  <button
                    key={duplicate.id}
                    type="button"
                    className="btn btn-xs h-auto min-h-6 py-1 text-left whitespace-normal"
                    disabled={writes.pending}
                    onClick={() => void closeAsDuplicate(duplicate, canonical)}
                  >
                    {text.duplicates.closeAs(duplicate.id, canonical.id)}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </HygieneCard>

        <HygieneCard title={text.lint.title} hint={text.lint.hint} empty={text.lint.empty}>
          {data?.lint.map((finding) =>
            issueRow(
              finding,
              text.lint.missing(
                finding.missing.map((section) => section.replace(/^#+\s*/, "")).join(", "),
              ),
            ),
          )}
        </HygieneCard>

        <HygieneCard
          title={text.closableEpics.title}
          hint={text.closableEpics.hint}
          empty={text.closableEpics.empty}
        >
          {data?.closableEpics.map((epic) => issueRow(epic))}
        </HygieneCard>

        <HygieneCard title={text.orphans.title} hint={text.orphans.hint} empty={text.orphans.empty}>
          {data?.orphans.map((orphan) =>
            issueRow(
              orphan,
              <>
                <span className="font-mono">{orphan.latestCommit}</span>{" "}
                {orphan.latestCommitMessage}
              </>,
            ),
          )}
        </HygieneCard>
      </div>

      <IssueDetailRoute />
    </main>
  );
}

type CardProps = {
  title: string;
  /** 무엇을 모은 카드인지 알리는 설명입니다. */
  hint: string;
  empty: string;
  /** 제목 줄 오른쪽에 두는 조작입니다. */
  action?: ReactNode;
  /** 아직 결과를 받지 못했으면 undefined입니다. 기준 일수를 바꿔 다시 읽는 동안에도 카드는 남기고 목록만 비웁니다. */
  children: ReactNode[] | undefined;
};

function HygieneCard({ title, hint, empty, action, children }: CardProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-2">
      <div className="flex items-end gap-3 px-1">
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <h2 className="flex items-baseline gap-2 text-[15px] font-bold">
            <span id={titleId}>{title}</span>
            {children && (
              <span className="font-mono text-xs font-normal text-base-content/45">
                {children.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-base-content/55">{hint}</p>
        </div>
        {action}
      </div>
      {children &&
        (children.length === 0 ? (
          <EmptyState message={empty} />
        ) : (
          <ul className="surface flex flex-col divide-y divide-base-300">{children}</ul>
        ))}
    </section>
  );
}

function IssueLink({ issue, href, detail }: { issue: IssueRef; href: string; detail?: ReactNode }) {
  const messages = useMessages();
  return (
    <Link
      href={href}
      scroll={false}
      className="flex flex-col gap-1 px-4 py-2.5 text-sm hover:bg-base-200/60"
    >
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="w-full font-medium wrap-anywhere">
          {issue.title || messages.common.untitled}
        </span>
        <span className="shrink-0 font-mono text-xs text-base-content/45">{issue.id}</span>
      </span>
      {detail && <span className="text-xs wrap-anywhere text-base-content/60">{detail}</span>}
    </Link>
  );
}
