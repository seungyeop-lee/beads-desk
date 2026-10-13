"use client";

import type { IssueStatus } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useState } from "react";
import { useEpicChildren, useEpics } from "@/client/modules/epics/application/useEpics";
import { settleExpandedEpics, sortEpics } from "@/client/modules/epics/domain/epicsView";
import {
  useIssueWrites,
  type IssueWrites,
} from "@/client/modules/issues/application/useIssueWrites";
import { byStatusGroup } from "@/client/modules/issues/domain/issueListView";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { STATUS_BADGES, STATUS_LABELS } from "@/client/ui/issues/issueLabels";
import { IssueTable } from "@/client/ui/issues/IssueTable";
import type { EpicSummary } from "@/shared/contract/epics";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";

/**
 * epic마다 하위 이슈 진행률을 보여 주고, 펼친 epic은 하위 이슈를 목록처럼 바로 고칠 수 있게 보여 줍니다.
 * 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function EpicsScreen() {
  const { data, error, loading } = useEpics();
  const writes = useIssueWrites();
  const issueHref = useIssueHref();
  const [expanded, setExpanded] = useState<ReadonlySet<string> | null>(null);
  const epics = data ? sortEpics(data) : null;
  const settled = epics ? settleExpandedEpics(epics, expanded) : expanded;
  if (settled !== expanded) setExpanded(settled);
  const open = settled ?? new Set<string>();

  const toggle = (epicId: string) => {
    const next = new Set(open);
    if (!next.delete(epicId)) next.add(epicId);
    setExpanded(next);
  };

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 p-6">
      <header className="flex items-baseline gap-3">
        <h1 className="text-xl font-bold">에픽</h1>
        {epics && <span className="text-sm text-base-content/60">{epics.length}개</span>}
        {(loading || writes.pending) && (
          <span className="loading loading-spinner loading-xs" aria-label="불러오는 중" />
        )}
      </header>

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>에픽을 불러오지 못했습니다: {error}</span>
        </div>
      )}
      <WriteErrorAlert writes={writes} />
      {epics?.length === 0 && (
        <p className="py-10 text-center text-base-content/60">에픽이 없습니다.</p>
      )}

      {epics?.map((summary) => (
        <EpicSection
          key={summary.epic.id}
          summary={summary}
          expanded={open.has(summary.epic.id)}
          onToggle={() => toggle(summary.epic.id)}
          issueHref={issueHref}
          writes={writes}
        />
      ))}

      <IssueDetailRoute />
    </main>
  );
}

type SectionProps = {
  summary: EpicSummary;
  expanded: boolean;
  onToggle: () => void;
  issueHref: (issueId: string) => string;
  writes: IssueWrites;
};

function EpicSection({ summary, expanded, onToggle, issueHref, writes }: SectionProps) {
  const { epic, totalChildren, closedChildren } = summary;
  const status = epic.status as IssueStatus;
  return (
    <section className="rounded-box border border-base-300 bg-base-100">
      <header className="flex items-center gap-3 p-3">
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          aria-expanded={expanded}
          aria-label={`${epic.id} 하위 이슈 ${expanded ? "접기" : "펼치기"}`}
          onClick={onToggle}
        >
          {expanded ? "▼" : "▶"}
        </button>
        <span className="font-mono text-xs text-base-content/60">{epic.id}</span>
        <Link
          className="link link-hover min-w-0 grow truncate font-semibold"
          href={issueHref(epic.id)}
          scroll={false}
        >
          {epic.title || "(제목 없음)"}
        </Link>
        <span className={`badge badge-sm ${STATUS_BADGES[status] ?? "badge-ghost"}`}>
          {STATUS_LABELS[status] ?? epic.status}
        </span>
        <progress
          className="progress progress-success w-32"
          value={closedChildren}
          max={Math.max(totalChildren, 1)}
          aria-label={`${epic.id} 진행률`}
        />
        <span className="w-14 text-right text-sm tabular-nums text-base-content/60">
          {closedChildren}/{totalChildren}
        </span>
      </header>
      {expanded && <EpicChildren epicId={epic.id} issueHref={issueHref} writes={writes} />}
    </section>
  );
}

function EpicChildren({
  epicId,
  issueHref,
  writes,
}: {
  epicId: string;
  issueHref: (issueId: string) => string;
  writes: IssueWrites;
}) {
  const { data: children, error } = useEpicChildren(epicId);
  return (
    <div className="border-t border-base-300 p-3">
      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>하위 이슈를 불러오지 못했습니다: {error}</span>
        </div>
      )}
      {!children && !error && <span className="loading loading-spinner loading-xs" />}
      {children && (
        <IssueTable
          issues={[...children].sort(byStatusGroup)}
          issueHref={issueHref}
          writes={writes}
          emptyMessage="하위 이슈가 없습니다."
        />
      )}
    </div>
  );
}
