"use client";

import type { Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useEpicDescendants, useEpics } from "@/client/modules/epics/application/useEpics";
import { useHumanGateTitles } from "@/client/modules/humanGates/application/useHumanGateTitles";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import {
  epicDescendantRows,
  notChildCandidate,
  settleExpandedEpics,
  sortEpics,
} from "@/client/modules/epics/domain/epicsView";
import {
  useIssueWrites,
  type IssueWrites,
} from "@/client/modules/issues/application/useIssueWrites";
import { addDependencyAction } from "@/server/web/issues/issueActions";
import { IssueConfirmPicker } from "@/client/ui/issues/IssueConfirmPicker";
import { IssueDetailRoute, useIssueHref } from "@/client/ui/issues/IssueDetailRoute";
import { NewIssueDialog } from "@/client/ui/issues/NewIssueDialog";
import { statusLabel, statusTone } from "@/client/ui/issues/issueLabels";
import { IssueTable } from "@/client/ui/issues/IssueTable";
import type { EpicSummary } from "@/shared/contract/epics";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { ChevronRightIcon, PlusIcon } from "@/client/ui/designSystem/icons";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { showToast } from "@/client/ui/designSystem/Toast";
import { useGraphHref } from "@/client/ui/screens/graph/useGraphHref";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/**
 * epic마다 하위 이슈 진행률을 보여 주고, 펼친 epic은 하위 이슈를 목록처럼 바로 고칠 수 있게 보여 줍니다.
 * 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function EpicsScreen() {
  const { data, error, loading } = useEpics();
  const humanGateTitles = useHumanGateTitles();
  const writes = useIssueWrites();
  const issueHref = useIssueHref();
  const [expanded, setExpanded] = useState<ReadonlySet<string> | null>(null);
  const epics = data ? sortEpics(data) : null;
  const settled = epics ? settleExpandedEpics(epics, expanded) : expanded;
  if (settled !== expanded) setExpanded(settled);
  const open = settled ?? new Set<string>();
  const messages = useMessages();

  const toggle = (epicId: string) => {
    const next = new Set(open);
    if (!next.delete(epicId)) next.add(epicId);
    setExpanded(next);
  };

  return (
    <main className="mx-auto flex max-w-[96rem] flex-col gap-3 px-8 pb-16">
      <ScreenHeader
        title={messages.epics.title}
        tone={screenTone("/epics")}
        count={epics?.length}
        loading={loading || writes.pending}
      />

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>{messages.epics.loadFailed(error)}</span>
        </div>
      )}
      <WriteErrorAlert writes={writes} />
      {epics?.length === 0 && <EmptyState message={messages.epics.empty} />}

      {epics?.map((summary) => (
        <EpicSection
          key={summary.epic.id}
          summary={summary}
          expanded={open.has(summary.epic.id)}
          onToggle={() => toggle(summary.epic.id)}
          humanGateTitles={humanGateTitles}
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
  humanGateTitles: ReadonlyMap<string, string>;
  issueHref: (issueId: string) => string;
  writes: IssueWrites;
};

function EpicSection({
  summary,
  expanded,
  onToggle,
  humanGateTitles,
  issueHref,
  writes,
}: SectionProps) {
  const { epic, totalChildren, closedChildren } = summary;
  const graphHref = useGraphHref();
  const percent = totalChildren === 0 ? 0 : Math.round((closedChildren / totalChildren) * 100);
  const messages = useMessages();
  return (
    <section className="surface">
      <header className="grid grid-cols-[2rem_3rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 py-3.5 xl:flex xl:gap-4 pr-5 pl-3">
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square text-base-content/50"
          aria-expanded={expanded}
          aria-label={messages.epics.toggleChildren(epic.id, expanded)}
          onClick={onToggle}
        >
          <ChevronRightIcon className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
        <span className="w-12 shrink-0 font-mono text-xs text-base-content/55" title={epic.id}>
          {shortIssueId(epic.id)}
        </span>
        <Link
          className="min-w-0 grow text-[15px] wrap-anywhere font-semibold decoration-base-content/30 underline-offset-4 hover:underline"
          href={issueHref(epic.id)}
          scroll={false}
        >
          {epic.title || messages.common.untitled}
        </Link>
        <div className="col-span-full flex flex-wrap items-center justify-end gap-3 xl:contents">
          <span className={`chip ${statusTone(epic.status)}`}>
            {statusLabel(messages, epic.status)}
          </span>
          <progress
            className="progress h-1.5 w-40 min-w-24 shrink text-[color-mix(in_oklab,var(--color-sage),#3f6212_40%)]"
            value={closedChildren}
            max={Math.max(totalChildren, 1)}
            aria-label={messages.epics.progress(epic.id)}
          />
          <span className="min-w-20 shrink-0 text-right whitespace-nowrap font-mono text-xs text-base-content/55 tabular-nums">
            {closedChildren}/{totalChildren} · {percent}%
          </span>
          <Link
            className="btn btn-ghost btn-xs shrink-0 rounded-full"
            href={graphHref({ kind: "epic", id: epic.id })}
          >
            {messages.graph.epicOrder}
          </Link>
        </div>
      </header>
      {expanded && (
        <EpicDescendants
          epic={epic}
          humanGateTitles={humanGateTitles}
          issueHref={issueHref}
          writes={writes}
        />
      )}
    </section>
  );
}

function EpicDescendants({
  epic,
  humanGateTitles,
  issueHref,
  writes,
}: {
  epic: Issue;
  humanGateTitles: ReadonlyMap<string, string>;
  issueHref: (issueId: string) => string;
  writes: IssueWrites;
}) {
  const { data, error } = useEpicDescendants(epic.id);
  const descendants = data?.issues;
  const waiters = useMemo(() => new Map(Object.entries(data?.waiters ?? {})), [data]);
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const messages = useMessages();
  return (
    <div className="flex flex-col gap-3 border-t border-base-300 bg-base-200/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-sm btn-ghost gap-1.5 rounded-full"
          onClick={() => setCreating(true)}
        >
          <PlusIcon width={14} height={14} />
          {messages.epics.newChild}
        </button>
        <div className="w-96 max-w-full">
          <IssueConfirmPicker
            label={messages.epics.addExistingChild}
            placeholder={messages.epics.addExistingChildPlaceholder}
            confirmLabel={messages.epics.addChildConfirm}
            disabled={writes.pending || !descendants}
            exclude={notChildCandidate(descendants ?? [])}
            onConfirm={async (issue) => {
              const result = await writes.run(() =>
                addDependencyAction(issue.id, epic.id, "parent-child"),
              );
              if (result.ok) showToast(messages.epics.childAdded(issue.id, epic.id));
              return result.ok;
            }}
          />
        </div>
      </div>
      {creating && (
        <NewIssueDialog
          fixedParent={epic}
          onCreated={(issueId) => {
            setCreating(false);
            router.push(issueHref(issueId), { scroll: false });
          }}
          onClose={() => setCreating(false)}
        />
      )}
      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          <span>{messages.epics.childrenLoadFailed(error)}</span>
        </div>
      )}
      {!descendants && !error && (
        <span className="flex items-center gap-2 text-sm text-base-content/60">
          <span className="loading loading-spinner loading-sm" />
          {messages.epics.childrenLoading}
        </span>
      )}
      {descendants && (
        <IssueTable
          tree={epicDescendantRows(descendants)}
          humanGateTitles={humanGateTitles}
          waiters={waiters}
          issueHref={issueHref}
          writes={writes}
          emptyMessage={messages.epics.childrenEmpty}
        />
      )}
    </div>
  );
}
