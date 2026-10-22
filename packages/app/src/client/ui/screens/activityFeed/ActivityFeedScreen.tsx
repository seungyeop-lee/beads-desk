"use client";

import { useActivityFeed } from "@/client/modules/activityFeed/application/useActivityFeed";
import { useActivitySeenAt } from "@/client/modules/activityFeed/application/useActivitySeenAt";
import {
  activityFeedRows,
  hasDateRange,
  type ActivityDateRange,
  type ActivityFeedRow,
} from "@/client/modules/activityFeed/domain/activityFeedView";
import { localDate } from "@/client/modules/issues/domain/issueDateFilter";
import { useAddressState } from "@/client/ui/address/useAddressState";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { CoveredIssueIdButton, CoveredIssueRow } from "@/client/ui/issues/CoveredIssueRow";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { screenTone } from "@/client/ui/shell/screenTabs";
import type { ActivityEntry, ActivityKind } from "@/shared/contract/activityFeed";
import { activityFeedHref, readActivityFeedAddress } from "./activityFeedAddress";

const KIND_TONES: Record<ActivityKind, string> = {
  created: "tone-azure",
  closed: "tone-sage",
  commented: "tone-none",
};

/**
 * workspace 전체에서 이슈를 만들고 닫고 댓글을 단 기록을 새것부터 날짜별로 보입니다. 줄을 누르면 이 화면 위에 이슈 상세가 열립니다.
 * 지난번에 이 화면을 연 뒤 생긴 기록과 그 전 기록 사이에 구분선을 긋습니다.
 * 이슈 상세 dialog와 주소의 날짜 범위가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function ActivityFeedScreen() {
  const messages = useMessages();
  const text = messages.activityFeed;
  const [range, setRange] = useAddressState(readActivityFeedAddress, activityFeedHref);
  // 지난 기간만 보고 나가도 최신 기록을 본 것으로 처리되지 않도록, 날짜 범위를 고른 채로 열면 본 시각을 갱신하지 않습니다.
  const seenAt = useActivitySeenAt(!hasDateRange(range));
  const { page, error, loading, showMore } = useActivityFeed(range);
  const rows = page ? activityFeedRows(page.entries, seenAt) : null;

  return (
    <main className="mx-auto flex max-w-content flex-col gap-4 px-8 pb-16">
      <ScreenHeader
        title={text.title}
        tone={screenTone("/activity")}
        help={text.description}
        loading={loading}
      >
        <DateRangeFields range={range} onChange={setRange} />
      </ScreenHeader>

      {error && <ErrorAlert>{text.loadFailed(error)}</ErrorAlert>}

      {rows &&
        (rows.length === 0 ? (
          <EmptyState message={hasDateRange(range) ? text.emptyInRange : text.empty} />
        ) : (
          <ol aria-label={text.entries} className="surface flex flex-col divide-y divide-base-300">
            {rows.map((row) => (
              <FeedRow key={rowKey(row)} row={row} />
            ))}
          </ol>
        ))}

      {page?.hasMore && (
        <button
          type="button"
          className="btn btn-sm self-center rounded-full border-base-300 bg-base-100 px-6"
          disabled={loading}
          onClick={showMore}
        >
          {text.showMore}
        </button>
      )}

      <IssueDetailRoute />
    </main>
  );
}

function rowKey(row: ActivityFeedRow): string {
  if (row.kind === "entry") return row.entry.key;
  return row.kind === "day" ? `day:${row.day}` : "seen";
}

function FeedRow({ row }: { row: ActivityFeedRow }) {
  const locale = useLocale();
  const messages = useMessages();
  if (row.kind === "entry") return <EntryRow entry={row.entry} />;
  if (row.kind === "seen") {
    return (
      <li className="flex items-center gap-3 bg-base-200/60 px-4 py-1.5 text-xs font-semibold text-primary">
        <hr className="grow border-primary/40" />
        {messages.activityFeed.seenBefore}
        <hr className="grow border-primary/40" />
      </li>
    );
  }
  return (
    <li className="caption bg-base-200/40 px-4 py-1.5">
      <h2>{localDate(row.day).toLocaleDateString(locale, { dateStyle: "full" })}</h2>
    </li>
  );
}

function EntryRow({ entry }: { entry: ActivityEntry }) {
  const locale = useLocale();
  const messages = useMessages();
  const issueHref = useIssueHref();
  const title = entry.title || messages.common.untitled;
  return (
    <CoveredIssueRow
      as="li"
      className="flex flex-col gap-1 px-4 py-2.5 text-sm hover:bg-base-200/60"
      issueId={entry.issueId}
      title={title}
      cover={{ href: issueHref(entry.issueId) }}
    >
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <time
          dateTime={new Date(entry.at).toISOString()}
          className="w-12 shrink-0 font-mono text-xs text-emphasis-50 tabular-nums"
        >
          {new Date(entry.at).toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          })}
        </time>
        <span className={`chip ${KIND_TONES[entry.kind]}`}>
          {messages.activityFeed.kinds[entry.kind]}
        </span>
        <CoveredIssueIdButton
          issueId={entry.issueId}
          className="shrink-0 rounded text-xs text-emphasis-50"
        />
        <span className="min-w-0 grow basis-60 font-medium wrap-anywhere">{title}</span>
        {entry.actor && <span className="shrink-0 text-xs text-emphasis-60">{entry.actor}</span>}
      </span>
      {entry.text && (
        <p className="line-clamp-2 text-xs sm:pl-15 wrap-anywhere text-emphasis-70">{entry.text}</p>
      )}
    </CoveredIssueRow>
  );
}

function DateRangeFields({
  range,
  onChange,
}: {
  range: ActivityDateRange;
  onChange: (range: ActivityDateRange) => void;
}) {
  const text = useMessages().activityFeed;
  return (
    <fieldset aria-label={text.dates} className="flex min-w-0 flex-wrap items-center gap-1.5">
      <input
        type="date"
        className="input input-sm w-36 rounded-full"
        aria-label={text.dateFrom}
        value={range.from ?? ""}
        onChange={(event) => onChange({ ...range, from: event.target.value || null })}
      />
      <span className="text-emphasis-40">~</span>
      <input
        type="date"
        className="input input-sm w-36 rounded-full"
        aria-label={text.dateTo}
        value={range.to ?? ""}
        onChange={(event) => onChange({ ...range, to: event.target.value || null })}
      />
      {hasDateRange(range) && (
        <button
          type="button"
          className="btn btn-ghost btn-xs rounded-full"
          onClick={() => onChange({ from: null, to: null })}
        >
          {text.clearDates}
        </button>
      )}
    </fieldset>
  );
}
