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

const DATE_FORMAT = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" });

/**
 * decision 유형의 이슈를 유효한 것과 닫힌 것으로 나눠 보이고, bd supersede로 대체한 관계를 함께 보여 줍니다.
 * 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function DecisionsScreen() {
  const { data, error, loading } = useDecisions();
  const writes = useIssueWrites();
  const issueHref = useIssueHref();
  const groups = data ? decisionGroups(data) : null;

  return (
    <main className="mx-auto flex max-w-[96rem] flex-col gap-4 px-8 pb-16">
      <ScreenHeader
        title="결정"
        tone={screenTone("/decisions")}
        count={data?.length}
        loading={loading || writes.pending}
      />

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>결정을 불러오지 못했습니다: {error}</span>
        </div>
      )}
      <WriteErrorAlert writes={writes} />

      {groups && (
        <div className="flex flex-col gap-10">
          <DecisionTable
            title="유효한 결정"
            rows={groups.current}
            emptyMessage="유효한 결정이 없습니다."
            issueHref={issueHref}
            writes={writes}
          />
          <DecisionTable
            title="닫힌 결정"
            rows={groups.retired}
            emptyMessage="닫힌 결정이 없습니다."
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
                <th>제목</th>
                <th className="w-32">상태</th>
                <th className="w-72">대체 관계</th>
                <th className="w-36">만든 날</th>
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
  return (
    <tr className="hover:bg-base-200/60">
      <td className="font-mono text-xs text-base-content/55">{decision.id}</td>
      <td>
        <Link
          className="font-medium decoration-base-content/30 underline-offset-4 hover:underline"
          href={issueHref(decision.id)}
          scroll={false}
        >
          {decision.title || "(제목 없음)"}
        </Link>
      </td>
      <td>
        <StatusSelect
          aria-label={`${decision.id} 상태`}
          value={decision.status}
          onChange={(status) => changeStatus(status, confirmForceClose)}
        />
      </td>
      <td className="text-xs">
        <div className="flex flex-col gap-1">
          {supersededBy && (
            <span className="flex items-center gap-2">
              <span className="text-base-content/50">새 결정</span>
              <IssueLinks ids={[supersededBy]} issueHref={issueHref} />
            </span>
          )}
          {supersedes.length > 0 && (
            <span className="flex items-center gap-2">
              <span className="text-base-content/50">이전 결정</span>
              <IssueLinks ids={supersedes} issueHref={issueHref} />
            </span>
          )}
        </div>
      </td>
      <td className="text-sm text-base-content/70 tabular-nums">
        {DATE_FORMAT.format(decision.createdAt)}
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
