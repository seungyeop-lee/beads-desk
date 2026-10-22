"use client";

import { GroupHeading } from "@/client/ui/designSystem/GroupHeading";
import { ScreenFrame } from "@/client/ui/designSystem/ScreenFrame";
import { useId, useState, type ReactNode } from "react";
import { useHygiene, useStaleIssues } from "@/client/modules/hygiene/application/useHygiene";
import { plainSectionTitle } from "@/client/modules/hygiene/domain/lintSections";
import { issueEdits } from "@/client/modules/issues/application/issueEdits";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { useCloseAsReplacedPrompts } from "@/client/ui/issues/useCloseAsReplacedPrompts";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { screenTone } from "@/client/ui/shell/screenTabs";
import {
  DEFAULT_STALE_DAYS,
  STALE_DAYS,
  type IssueRef,
  type StaleDays,
} from "@/shared/contract/hygiene";
import { CoveredIssueIdButton, CoveredIssueRow } from "@/client/ui/issues/CoveredIssueRow";

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
  const closeAsReplacedPrompts = useCloseAsReplacedPrompts();
  const text = useMessages().hygiene;

  const issueRow = (issue: IssueRef, detail?: ReactNode) => (
    <li key={issue.id}>
      <IssueRow issue={issue} href={issueHref(issue.id)} detail={detail} />
    </li>
  );

  return (
    <ScreenFrame>
      <ScreenHeader
        title={text.title}
        tone={screenTone("/hygiene")}
        help={text.description}
        loading={loading || stale.loading || writes.pending}
      />

      {/* 서버에 연결하지 못하면 두 조회가 같은 오류를 내므로 한 번만 보입니다. */}
      {[...new Set([error, stale.error])].map(
        (message) => message && <ErrorAlert key={message}>{text.loadFailed(message)}</ErrorAlert>,
      )}
      <WriteErrorAlert writes={writes} />

      {/* 넓은 창에서는 열마다 카드를 따로 쌓습니다. 카드를 grid 행에 나란히 두면 목록이 긴 카드가 행 높이를 정해서,
          옆 열의 다음 카드가 그 목록이 끝나는 아래까지 밀려납니다.
          한 열에서는 열 요소를 contents로 풀어 카드를 바깥 grid에 바로 놓고, 카드의 order로 순서를 정합니다. */}
      <div className="grid grid-cols-1 items-start gap-x-6 gap-y-8 lg:grid-cols-2">
        <div className={HYGIENE_COLUMN}>
          <HygieneCard
            className="order-1"
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
            className="order-3"
            title={text.lint.title}
            hint={text.lint.hint}
            empty={text.lint.empty}
          >
            {data?.lint.map((finding) =>
              issueRow(
                finding,
                text.lint.missing(finding.missing.map(plainSectionTitle).join(", ")),
              ),
            )}
          </HygieneCard>
        </div>

        <div className={HYGIENE_COLUMN}>
          <HygieneCard
            className="order-2"
            title={text.duplicates.title}
            hint={text.duplicates.hint}
            empty={text.duplicates.empty}
          >
            {data?.duplicates.map((pair) => (
              <li
                key={pair.map((issue) => issue.id).join(" ")}
                className="flex flex-col gap-1 py-2"
              >
                {pair.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} href={issueHref(issue.id)} />
                ))}
                <span className="flex flex-wrap gap-2 px-4 py-1">
                  {[pair, pair.toReversed()].map(([duplicate, canonical]) => (
                    <button
                      key={duplicate.id}
                      type="button"
                      className="btn btn-xs h-auto min-h-6 py-1 text-left whitespace-normal"
                      disabled={writes.pending}
                      onClick={() =>
                        void issueEdits(writes, duplicate.id).closeAsReplaced(
                          "duplicate",
                          canonical.id,
                          closeAsReplacedPrompts,
                        )
                      }
                    >
                      {text.duplicates.closeAs(duplicate.id, canonical.id)}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </HygieneCard>

          <HygieneCard
            className="order-4"
            title={text.closableEpics.title}
            hint={text.closableEpics.hint}
            empty={text.closableEpics.empty}
          >
            {data?.closableEpics.map((epic) => issueRow(epic))}
          </HygieneCard>

          <HygieneCard
            className="order-5"
            title={text.orphans.title}
            hint={text.orphans.hint}
            empty={text.orphans.empty}
          >
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
      </div>

      <IssueDetailRoute />
    </ScreenFrame>
  );
}

const HYGIENE_COLUMN = "contents lg:flex lg:flex-col lg:gap-y-8";

type CardProps = {
  /** 한 열 배치에서 카드가 놓일 순서(order-*)입니다. */
  className: string;
  title: string;
  /** 무엇을 모은 카드인지 알리는 설명입니다. */
  hint: string;
  empty: string;
  /** 제목 줄 오른쪽에 두는 조작입니다. */
  action?: ReactNode;
  /** 아직 결과를 받지 못했으면 undefined입니다. 기준 일수를 바꿔 다시 읽는 동안에도 카드는 남기고 목록만 비웁니다. */
  children: ReactNode[] | undefined;
};

function HygieneCard({ className, title, hint, empty, action, children }: CardProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <div className="flex items-end gap-3 px-1">
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <GroupHeading
            title={<span id={titleId}>{title}</span>}
            count={children?.length}
            variant="bare"
          />
          <p className="text-xs text-emphasis-60">{hint}</p>
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

function IssueRow({ issue, href, detail }: { issue: IssueRef; href: string; detail?: ReactNode }) {
  const messages = useMessages();
  const title = issue.title || messages.common.untitled;
  return (
    <CoveredIssueRow
      className="flex flex-col gap-1 px-4 py-2.5 text-sm hover:bg-base-200/60"
      issueId={issue.id}
      title={title}
      cover={{ href }}
    >
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="w-full font-medium wrap-anywhere">{title}</span>
        <CoveredIssueIdButton
          issueId={issue.id}
          className="shrink-0 rounded text-xs text-emphasis-50"
        />
      </span>
      {detail && <span className="text-xs wrap-anywhere text-emphasis-60">{detail}</span>}
    </CoveredIssueRow>
  );
}
