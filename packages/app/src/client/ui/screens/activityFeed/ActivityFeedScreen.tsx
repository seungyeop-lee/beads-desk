"use client";

import { DateRangeFields } from "@/client/ui/designSystem/DateRangeFields";
import { ScreenFrame } from "@/client/ui/designSystem/ScreenFrame";
import { useActivityFeed } from "@/client/modules/activityFeed/application/useActivityFeed";
import { useActivitySeenAt } from "@/client/modules/activityFeed/application/useActivitySeenAt";
import {
  activityFeedRows,
  hasDateRange,
  type ActivityFeedRow,
} from "@/client/modules/activityFeed/domain/activityFeedView";
import { localDate } from "@/client/modules/issues/domain/issueDateFilter";
import { useAddressState } from "@/client/ui/address/useAddressState";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { CoveredIssueIdButton, CoveredIssueRow } from "@/client/ui/issues/CoveredIssueRow";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { fieldChangeText } from "@/client/ui/issues/detail/activityText";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { screenTone } from "@/client/ui/shell/screenTabs";
import type { ActivityEntry, ActivityKind } from "@/shared/contract/activityFeed";
import { activityFeedHref, readActivityFeedAddress } from "./activityFeedAddress";

const KIND_TONES: Record<ActivityKind, string> = {
  created: "tone-azure",
  closed: "tone-sage",
  commented: "tone-none",
  updated: "tone-peach",
  deleted: "tone-coral",
};

/** 닫은 사유, 댓글 본문, 바뀐 필드처럼 기록 줄 아래에 붙는 글입니다. */
const DETAIL_TEXT = "line-clamp-2 text-xs sm:pl-15 wrap-anywhere text-emphasis-70";

/**
 * workspace 전체에서 이슈를 만들고 고치고 닫고 댓글을 달고 지운 기록을 새것부터 날짜별로 보입니다. 줄을 누르면 이 화면 위에 이슈 상세가 열립니다.
 * 고치고 지운 기록은 events journal에서 읽으므로, journal이 꺼진 workspace에서는 켜는 방법을 목록 위에 안내합니다.
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
    <ScreenFrame>
      <ScreenHeader
        title={text.title}
        tone={screenTone("/activity")}
        help={text.description}
        loading={loading}
      >
        <DateRangeFields
          label={text.dates}
          fromLabel={text.dateFrom}
          toLabel={text.dateTo}
          clearLabel={text.clearDates}
          range={range}
          onChange={setRange}
        />
      </ScreenHeader>

      {error && <ErrorAlert>{text.loadFailed(error)}</ErrorAlert>}

      {page && !page.journalEnabled && (
        <div className="surface flex flex-col items-start gap-2 px-4 py-3 text-sm">
          <p className="text-emphasis-70">{text.journalOff.message}</p>
          <code className="rounded bg-base-200 px-2 py-1 font-mono text-xs wrap-anywhere">
            {text.journalOff.command}
          </code>
        </div>
      )}

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
    </ScreenFrame>
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

const ENTRY_ROW = "flex flex-col gap-1 px-4 py-2.5 text-sm";

/** 지운 이슈는 상세 화면이 없으므로 삭제 기록은 이슈 링크 없이 그립니다. */
function EntryRow({ entry }: { entry: ActivityEntry }) {
  const messages = useMessages();
  const issueHref = useIssueHref();
  const title = entry.title || messages.common.untitled;
  if (entry.kind === "deleted") {
    return (
      <li className={ENTRY_ROW}>
        <EntryContent entry={entry} title={title} />
      </li>
    );
  }
  return (
    <CoveredIssueRow
      as="li"
      className={`${ENTRY_ROW} hover:bg-base-200/60`}
      issueId={entry.issueId}
      title={title}
      cover={{ href: issueHref(entry.issueId) }}
    >
      <EntryContent entry={entry} title={title} />
    </CoveredIssueRow>
  );
}

function EntryContent({ entry, title }: { entry: ActivityEntry; title: string }) {
  const locale = useLocale();
  const messages = useMessages();
  return (
    <>
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
      {entry.text && <p className={DETAIL_TEXT}>{entry.text}</p>}
      {entry.changes.map((change) => (
        <p key={change.field} className={DETAIL_TEXT}>
          {fieldChangeText(messages, locale, change)}
        </p>
      ))}
    </>
  );
}
