"use client";

import Link from "next/link";
import { useDecisions } from "@/client/modules/decisions/application/useDecisions";
import { decisionGroups, type DecisionRow } from "@/client/modules/decisions/domain/decisionsView";
import { issueEdits } from "@/client/modules/issues/application/issueEdits";
import {
  useIssueWrites,
  type IssueWrites,
} from "@/client/modules/issues/application/useIssueWrites";
import { confirmForceClose } from "@/client/ui/issues/fields/confirmForceClose";
import { StatusSelect } from "@/client/ui/issues/fields/StatusSelect";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";

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
    <main className="mx-auto flex max-w-[96rem] flex-col gap-4 px-8 pb-16">
      <ScreenHeader
        title={messages.decisions.title}
        tone={screenTone("/decisions")}
        count={data?.length}
        loading={loading || writes.pending}
      />

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>{messages.decisions.loadFailed(error)}</span>
        </div>
      )}
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
    </main>
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
      <h2 className="flex items-baseline gap-2 text-lg font-bold tracking-tight">
        {title}
        <span className="font-mono text-xs font-normal text-base-content/45">{rows.length}</span>
      </h2>
      {rows.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="surface overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-32">ID</th>
                <th>{messages.issue.title}</th>
                <th className="w-32">{messages.issue.status}</th>
                <th className="w-72">{messages.decisions.supersession}</th>
                <th className="w-36">{messages.decisions.createdOn}</th>
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
      <td className="font-mono text-xs text-base-content/55">{decision.id}</td>
      <td>
        <Link
          className="font-medium decoration-base-content/30 underline-offset-4 hover:underline"
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
          onChange={(status) => changeStatus(status, confirmForceClose)}
        />
      </td>
      <td className="text-xs">
        <div className="flex flex-col gap-1">
          {supersededBy && (
            <span className="flex items-center gap-2">
              <span className="text-base-content/50">{messages.decisions.supersededBy}</span>
              <IssueLinks ids={[supersededBy]} issueHref={issueHref} />
            </span>
          )}
          {supersedes.length > 0 && (
            <span className="flex items-center gap-2">
              <span className="text-base-content/50">{messages.decisions.supersedes}</span>
              <IssueLinks ids={supersedes} issueHref={issueHref} />
            </span>
          )}
        </div>
      </td>
      <td className="text-sm text-base-content/70 tabular-nums">
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
