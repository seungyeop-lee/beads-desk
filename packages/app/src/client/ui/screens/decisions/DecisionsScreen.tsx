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
    <main className="mx-auto flex max-w-7xl flex-col gap-4 p-6">
      <header className="flex items-baseline gap-3">
        <h1 className="text-xl font-bold">결정</h1>
        {data && <span className="text-sm text-base-content/60">{data.length}개</span>}
        {(loading || writes.pending) && (
          <span className="loading loading-spinner loading-xs" aria-label="불러오는 중" />
        )}
      </header>

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>결정을 불러오지 못했습니다: {error}</span>
        </div>
      )}
      <WriteErrorAlert writes={writes} />

      {groups && (
        <>
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
        </>
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
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold">
        {title} <span className="text-sm font-normal text-base-content/60">{rows.length}개</span>
      </h2>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-base-content/60">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table className="table table-sm">
            <thead>
              <tr>
                <th className="w-36">ID</th>
                <th>제목</th>
                <th className="w-32">상태</th>
                <th className="w-64">대체 관계</th>
                <th className="w-32">만든 날</th>
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
    <tr className="hover:bg-base-200">
      <td className="font-mono text-xs">{decision.id}</td>
      <td>
        <Link className="link link-hover" href={issueHref(decision.id)} scroll={false}>
          {decision.title || "(제목 없음)"}
        </Link>
      </td>
      <td>
        <StatusSelect
          aria-label={`${decision.id} 상태`}
          className="select-xs"
          value={decision.status}
          onChange={(status) => changeStatus(status, confirmForceClose)}
        />
      </td>
      <td className="text-sm">
        {supersededBy && (
          <div>
            새 결정: <IssueLinks ids={[supersededBy]} issueHref={issueHref} />
          </div>
        )}
        {supersedes.length > 0 && (
          <div>
            이전 결정: <IssueLinks ids={supersedes} issueHref={issueHref} />
          </div>
        )}
      </td>
      <td className="text-sm tabular-nums">{DATE_FORMAT.format(decision.createdAt)}</td>
    </tr>
  );
}

function IssueLinks({ ids, issueHref }: { ids: string[]; issueHref: (issueId: string) => string }) {
  return ids.map((id, index) => (
    <span key={id}>
      {index > 0 && ", "}
      <Link className="link font-mono text-xs" href={issueHref(id)} scroll={false}>
        {id}
      </Link>
    </span>
  ));
}
