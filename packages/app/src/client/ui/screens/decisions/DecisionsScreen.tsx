"use client";

import { GroupHeading } from "@/client/ui/designSystem/GroupHeading";
import { ScreenFrame } from "@/client/ui/designSystem/ScreenFrame";
import Link from "next/link";
import { useDecisions } from "@/client/modules/decisions/application/useDecisions";
import { decisionGroups, type DecisionRow } from "@/client/modules/decisions/domain/decisionsView";
import { issueEdits } from "@/client/modules/issues/application/issueEdits";
import {
  useIssueWrites,
  type IssueWrites,
} from "@/client/modules/issues/application/useIssueWrites";
import { statusPrompts } from "@/client/ui/issues/fields/statusPrompts";
import { StatusSelect } from "@/client/ui/issues/fields/StatusSelect";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { CopyIssueIdButton } from "@/client/ui/issues/CopyIssueIdButton";

/**
 * decision 유형의 이슈를 유효한 것과 닫힌 것으로 나눠 보이고, bd supersede로 대체한 관계를 함께 보여 줍니다.
 * 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function DecisionsScreen() {
  const { data, error, loading } = useDecisions();
  const writes = useIssueWrites();
  const issueHref = useIssueHref();
  const groups = data ? decisionGroups(data) : null;
  const messages = useMessages();

  return (
    <ScreenFrame>
      <ScreenHeader
        title={messages.decisions.title}
        tone={screenTone("/decisions")}
        count={data?.length}
        loading={loading || writes.pending}
      />

      {error && <ErrorAlert>{messages.decisions.loadFailed(error)}</ErrorAlert>}
      <WriteErrorAlert writes={writes} />

      {groups && (
        <div className="flex flex-col gap-10">
          <DecisionTable
            title={messages.decisions.current}
            rows={groups.current}
            emptyMessage={messages.decisions.currentEmpty}
            issueHref={issueHref}
            writes={writes}
          />
          <DecisionTable
            title={messages.decisions.retired}
            rows={groups.retired}
            emptyMessage={messages.decisions.retiredEmpty}
            issueHref={issueHref}
            writes={writes}
          />
        </div>
      )}

      <IssueDetailRoute />
    </ScreenFrame>
  );
}

type TableProps = {
  title: string;
  rows: DecisionRow[];
  emptyMessage: string;
  issueHref: (issueId: string) => string;
  writes: IssueWrites;
};

function DecisionTable({ title, rows, emptyMessage, issueHref, writes }: TableProps) {
  const messages = useMessages();
  return (
    <section className="flex flex-col gap-3">
      <GroupHeading title={title} count={rows.length} variant="table" />
      {rows.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="@container surface min-w-0 max-w-full overflow-x-auto">
          {/* 제목 열은 표 폭에서 나머지 열의 폭을 뺀 만큼 차지합니다. 표 영역이 64rem보다 좁으면 표를 64rem으로 넓히고
              상태·대체 관계·날짜 열은 가로 스크롤로 봅니다. 표 영역이 64rem에서 그 세 열의 폭을 뺀 폭보다 좁으면
              64rem 대신 영역 폭(100cqw)에 세 열의 폭만 더해 ID와 제목 열이 스크롤하지 않아도 영역 안에 다 보이게 합니다.
              세 열의 폭은 표에 둔 CSS 변수로 정하고, 각 열의 머리 칸과 표 폭 계산이 같은 변수를 읽습니다. */}
          <table
            className={`table ${TRAILING_COLUMNS} w-[max(100cqw,min(100cqw_+_var(--status-column)_+_var(--supersession-column)_+_var(--created-on-column),64rem))] table-fixed`}
          >
            <thead>
              <tr>
                <th className="w-24">ID</th>
                <th>{messages.issue.title}</th>
                <th className="w-(--status-column)">{messages.issue.status}</th>
                <th className="w-(--supersession-column)">{messages.decisions.supersession}</th>
                <th className="w-(--created-on-column)">{messages.decisions.createdOn}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <DecisionRowView
                  key={row.decision.id}
                  row={row}
                  issueHref={issueHref}
                  writes={writes}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const TRAILING_COLUMNS =
  "[--status-column:8rem] [--supersession-column:18rem] [--created-on-column:9rem]";

function DecisionRowView({
  row,
  issueHref,
  writes,
}: {
  row: DecisionRow;
  issueHref: (issueId: string) => string;
  writes: IssueWrites;
}) {
  const { decision, supersededBy, supersedes } = row;
  const { changeStatus } = issueEdits(writes, decision.id);
  const locale = useLocale();
  const messages = useMessages();
  return (
    <tr className="hover:bg-base-200/60">
      <td>
        <CopyIssueIdButton
          issueId={decision.id}
          short
          className="rounded text-xs text-emphasis-60"
        />
      </td>
      <td>
        <Link
          className="font-medium wrap-anywhere decoration-base-content/30 underline-offset-4 hover:underline"
          href={issueHref(decision.id)}
          scroll={false}
        >
          {decision.title || messages.common.untitled}
        </Link>
      </td>
      <td>
        <StatusSelect
          aria-label={messages.issueTable.statusOf(decision.id)}
          value={decision.status}
          issueType={decision.issueType}
          onChange={(status) => changeStatus(status, statusPrompts)}
        />
      </td>
      <td className="text-xs">
        <div className="flex flex-col gap-1">
          {supersededBy && (
            <span className="flex items-center gap-2">
              <span className="text-emphasis-50">{messages.decisions.supersededBy}</span>
              <IssueLinks ids={[supersededBy]} issueHref={issueHref} />
            </span>
          )}
          {supersedes.length > 0 && (
            <span className="flex items-center gap-2">
              <span className="text-emphasis-50">{messages.decisions.supersedes}</span>
              <IssueLinks ids={supersedes} issueHref={issueHref} />
            </span>
          )}
        </div>
      </td>
      <td className="text-sm text-emphasis-70 tabular-nums">
        {new Date(decision.createdAt).toLocaleDateString(locale, { dateStyle: "medium" })}
      </td>
    </tr>
  );
}

function IssueLinks({ ids, issueHref }: { ids: string[]; issueHref: (issueId: string) => string }) {
  return (
    <span className="flex flex-wrap gap-1">
      {ids.map((id) => (
        <Link
          key={id}
          className="rounded-md bg-base-200 px-1.5 py-0.5 font-mono hover:bg-base-300"
          href={issueHref(id)}
          scroll={false}
        >
          {id}
        </Link>
      ))}
    </span>
  );
}
