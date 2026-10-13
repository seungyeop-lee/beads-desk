"use client";

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
import { statusLabel, statusTone } from "@/client/ui/issues/issueLabels";
import { IssueTable } from "@/client/ui/issues/IssueTable";
import type { EpicSummary } from "@/shared/contract/epics";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { ChevronRightIcon } from "@/client/ui/designSystem/icons";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { screenTone } from "@/client/ui/shell/screenTabs";

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
    <main className="mx-auto flex max-w-[96rem] flex-col gap-3 px-8 pb-16">
      <ScreenHeader
        title="에픽"
        tone={screenTone("/epics")}
        count={epics?.length}
        loading={loading || writes.pending}
      />

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>에픽을 불러오지 못했습니다: {error}</span>
        </div>
      )}
      <WriteErrorAlert writes={writes} />
      {epics?.length === 0 && <EmptyState message="에픽이 없습니다." />}

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
  const percent = totalChildren === 0 ? 0 : Math.round((closedChildren / totalChildren) * 100);
  return (
    <section className="surface">
      <header className="flex items-center gap-4 py-3.5 pr-5 pl-3">
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square text-base-content/50"
          aria-expanded={expanded}
          aria-label={`${epic.id} 하위 이슈 ${expanded ? "접기" : "펼치기"}`}
          onClick={onToggle}
        >
          <ChevronRightIcon className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
        <span className="w-20 shrink-0 font-mono text-xs text-base-content/55">{epic.id}</span>
        <Link
          className="min-w-0 grow truncate text-[15px] font-semibold decoration-base-content/30 underline-offset-4 hover:underline"
          href={issueHref(epic.id)}
          scroll={false}
        >
          {epic.title || "(제목 없음)"}
        </Link>
        <span className={`chip ${statusTone(epic.status)}`}>{statusLabel(epic.status)}</span>
        <progress
          className="progress h-1.5 w-40 shrink-0 text-[color-mix(in_oklab,var(--color-sage),#3f6212_25%)]"
          value={closedChildren}
          max={Math.max(totalChildren, 1)}
          aria-label={`${epic.id} 진행률`}
        />
        <span className="w-20 shrink-0 text-right font-mono text-xs text-base-content/55 tabular-nums">
          {closedChildren}/{totalChildren} · {percent}%
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
    <div className="border-t border-base-300 bg-base-200/40 p-4">
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
