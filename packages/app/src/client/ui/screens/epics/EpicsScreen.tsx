"use client";

import type { Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { useEpicDescendants, useEpics } from "@/client/modules/epics/application/useEpics";
import { groupEpics, type EpicGroupKind } from "@/client/modules/epics/domain/epicGroups";
import type { GateTitles } from "@/client/modules/humanGates/domain/humanGateBlockers";
import { useGateTitles } from "@/client/modules/humanGates/application/useGateTitles";
import {
  childProgress,
  epicDescendantRows,
  notChildCandidate,
  searchEpics,
  settleExpandedEpics,
  sortEpics,
  topLevelEpics,
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
import { EpicProgress } from "@/client/ui/issues/EpicProgress";
import type { EpicSummary } from "@/shared/contract/epics";
import { WriteErrorAlert } from "@/client/ui/issues/WriteErrorAlert";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { ChevronRightIcon, PlusIcon } from "@/client/ui/designSystem/icons";
import { ScreenHeader } from "@/client/ui/designSystem/ScreenHeader";
import { SearchField } from "@/client/ui/designSystem/SearchField";
import { showToast } from "@/client/ui/designSystem/Toast";
import { useGraphHref } from "@/client/ui/screens/graph/useGraphHref";
import { screenTone } from "@/client/ui/shell/screenTabs";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { CopyIssueIdButton } from "@/client/ui/issues/CopyIssueIdButton";

/** 검색하는 동안 사용자가 접거나 편 에픽 카드와 묶음입니다. query가 지금 검색어와 다르면 무시합니다. */
type SearchToggles = {
  query: string;
  epics: ReadonlySet<string>;
  groups: ReadonlySet<EpicGroupKind>;
};

/**
 * epic마다 하위 이슈 진행률을 보여 주고, 펼친 epic은 하위 이슈를 목록처럼 바로 고칠 수 있게 보여 줍니다.
 * 열린 에픽과 닫힌 에픽을 묶음으로 나누고, 처음에는 닫힌 묶음만 접어 둡니다.
 * 검색하는 동안에는 맞은 에픽만 보이고, 묶음과 맞은 하위 에픽이 속한 카드를 펼칩니다. 이때 접고 편 것은 그 검색어에서만 유지하므로,
 * 검색어를 지우면 사용자가 검색 전에 정해 둔 펼침 상태로 돌아갑니다.
 * 이슈 상세 dialog가 useSearchParams를 쓰므로 Suspense 안에서 렌더링합니다.
 */
export function EpicsScreen() {
  const { data, error, loading } = useEpics();
  const gateTitles = useGateTitles();
  const writes = useIssueWrites();
  const issueHref = useIssueHref();
  const [expanded, setExpanded] = useState<ReadonlySet<string> | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<EpicGroupKind>>(
    new Set(["closed"]),
  );
  const [search, setSearch] = useState("");
  // 에픽이 많으면 카드를 다시 그리는 데 시간이 걸려, 검색어 입력이 먼저 보이도록 목록은 늦춰 갱신합니다.
  const deferredSearch = useDeferredValue(search);
  const [searchToggles, setSearchToggles] = useState<SearchToggles>(noSearchToggles(""));
  const epics = data ? sortEpics(topLevelEpics(data)) : null;
  const settled = epics ? settleExpandedEpics(epics, expanded) : expanded;
  if (settled !== expanded) setExpanded(settled);
  const open = settled ?? new Set<string>();
  const found = data ? searchEpics(data, deferredSearch) : null;
  const shown = found ? epics?.filter(({ epic }) => found.cards.has(epic.id)) : epics;
  const toggles =
    searchToggles.query === deferredSearch ? searchToggles : noSearchToggles(deferredSearch);
  const messages = useMessages();

  const epicExpanded = (epicId: string) =>
    found
      ? (open.has(epicId) || found.expand.has(epicId)) !== toggles.epics.has(epicId)
      : open.has(epicId);
  const groupExpanded = (kind: EpicGroupKind) =>
    found ? !toggles.groups.has(kind) : !collapsedGroups.has(kind);
  const toggle = (epicId: string) => {
    if (found) setSearchToggles({ ...toggles, epics: toggled(toggles.epics, epicId) });
    else setExpanded(toggled(open, epicId));
  };
  const toggleGroup = (kind: EpicGroupKind) => {
    if (found) setSearchToggles({ ...toggles, groups: toggled(toggles.groups, kind) });
    else setCollapsedGroups(toggled(collapsedGroups, kind));
  };

  return (
    <main className="mx-auto flex max-w-[96rem] flex-col gap-3 px-8 pb-16">
      <ScreenHeader
        title={messages.epics.title}
        tone={screenTone("/epics")}
        count={shown?.length}
        loading={loading || writes.pending}
      />

      {error && <ErrorAlert>{messages.epics.loadFailed(error)}</ErrorAlert>}
      <WriteErrorAlert writes={writes} />
      <SearchField
        label={messages.epics.search}
        placeholder={messages.epics.searchPlaceholder}
        value={search}
        onChange={setSearch}
        className="w-64 max-w-full"
      />

      {epics?.length === 0 ? (
        <EmptyState message={messages.epics.empty} />
      ) : (
        shown?.length === 0 && <EmptyState message={messages.epics.noMatches} />
      )}

      {shown &&
        groupEpics(shown).map((group) => (
          <EpicGroupSection
            key={group.kind}
            kind={group.kind}
            count={group.epics.length}
            expanded={groupExpanded(group.kind)}
            onToggle={() => toggleGroup(group.kind)}
          >
            {group.epics.map((summary) => (
              <EpicSection
                key={summary.epic.id}
                summary={summary}
                expanded={epicExpanded(summary.epic.id)}
                onToggle={() => toggle(summary.epic.id)}
                revealed={found?.expand ?? NOTHING_REVEALED}
                gateTitles={gateTitles}
                issueHref={issueHref}
                writes={writes}
              />
            ))}
          </EpicGroupSection>
        ))}

      <IssueDetailRoute />
    </main>
  );
}

const NOTHING_REVEALED: ReadonlySet<string> = new Set();

function noSearchToggles(query: string): SearchToggles {
  return { query, epics: new Set(), groups: new Set() };
}

function toggled<T>(values: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const next = new Set(values);
  if (!next.delete(value)) next.add(value);
  return next;
}

/** 이슈 화면의 상태 묶음과 같은 모양으로 묶음 머리를 보이고, 펼쳤을 때만 에픽 카드를 보입니다. */
function EpicGroupSection({
  kind,
  count,
  expanded,
  onToggle,
  children,
}: {
  kind: EpicGroupKind;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const messages = useMessages();
  const label = messages.epics.groups[kind];
  return (
    <section aria-label={label} className="flex flex-col gap-3">
      <h2 className="px-1">
        <button
          type="button"
          className="flex items-baseline gap-2 text-[15px] font-bold"
          aria-expanded={expanded}
          aria-label={messages.epics.toggleGroup(label, expanded)}
          onClick={onToggle}
        >
          <ChevronRightIcon
            width={14}
            height={14}
            className={`self-center text-base-content/50 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          <span className={`tone-dot ${statusTone(kind)} self-center`} />
          {label}
          <span className="font-mono text-xs font-normal text-base-content/50">{count}</span>
        </button>
      </h2>
      {expanded && children}
    </section>
  );
}

type SectionProps = {
  summary: EpicSummary;
  expanded: boolean;
  onToggle: () => void;
  /** 검색어에 맞은 하위 에픽이 보이도록 펼칠 에픽의 id입니다. 하위 목록에서 이 id의 행을 펼칩니다. */
  revealed: ReadonlySet<string>;
  gateTitles: GateTitles;
  issueHref: (issueId: string) => string;
  writes: IssueWrites;
};

function EpicSection({
  summary,
  expanded,
  onToggle,
  revealed,
  gateTitles,
  issueHref,
  writes,
}: SectionProps) {
  const { epic, totalChildren, closedChildren } = summary;
  const graphHref = useGraphHref();
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
        <CopyIssueIdButton
          issueId={epic.id}
          short
          className="w-12 shrink-0 rounded text-left text-xs text-base-content/55"
        />
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
          {epic.status === "closed" ? (
            <ClosedEpicProgress
              closedAt={epic.closedAt}
              closed={closedChildren}
              total={totalChildren}
            />
          ) : (
            <EpicProgress
              epicId={epic.id}
              closed={closedChildren}
              total={totalChildren}
              barClassName="w-40 min-w-24 shrink"
              countClassName="min-w-20 shrink-0 text-right"
            />
          )}
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
          revealed={revealed}
          gateTitles={gateTitles}
          issueHref={issueHref}
          writes={writes}
        />
      )}
    </section>
  );
}

/** 닫힌 에픽은 진행률이 거의 항상 100%라, 막대 대신 닫은 날짜와 닫힌 하위 이슈 수를 보입니다. */
function ClosedEpicProgress({
  closedAt,
  closed,
  total,
}: {
  closedAt: number | null;
  closed: number;
  total: number;
}) {
  const messages = useMessages();
  const locale = useLocale();
  return (
    <>
      {closedAt !== null && (
        <time
          className="whitespace-nowrap text-xs text-base-content/55"
          dateTime={new Date(closedAt).toISOString()}
        >
          {messages.epics.closedOn(
            new Date(closedAt).toLocaleDateString(locale, { dateStyle: "medium" }),
          )}
        </time>
      )}
      <span className="min-w-20 shrink-0 whitespace-nowrap text-right font-mono text-xs text-base-content/55 tabular-nums">
        {closed}/{total}
      </span>
    </>
  );
}

function EpicDescendants({
  epic,
  revealed,
  gateTitles,
  issueHref,
  writes,
}: {
  epic: Issue;
  revealed: ReadonlySet<string>;
  gateTitles: GateTitles;
  issueHref: (issueId: string) => string;
  writes: IssueWrites;
}) {
  const { data, error } = useEpicDescendants(epic.id);
  const descendants = data?.issues;
  const waiters = useMemo(() => new Map(Object.entries(data?.waiters ?? {})), [data]);
  const progress = useMemo(() => childProgress(data?.issues ?? []), [data]);
  const revealedRows = new Set(
    descendants?.filter(({ id }) => revealed.has(id)).map(({ id }) => id),
  );
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const graphHref = useGraphHref();
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
            exclude={notChildCandidate(epic.id, descendants ?? [])}
            onConfirm={async (issue) => {
              const result = await writes.run((workspace) =>
                addDependencyAction(workspace, issue.id, epic.id, "parent-child"),
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
      {error && <ErrorAlert>{messages.epics.childrenLoadFailed(error)}</ErrorAlert>}
      {!descendants && !error && (
        <span className="flex items-center gap-2 text-sm text-base-content/60">
          <span className="loading loading-spinner loading-sm" />
          {messages.epics.childrenLoading}
        </span>
      )}
      {descendants && (
        <IssueTable
          // 검색어에 맞은 하위 에픽이 접힌 행 아래에 있으면, 그 행을 펼친 표를 새로 그려 하위 에픽이 보이게 합니다.
          key={[...revealedRows].join(" ")}
          tree={epicDescendantRows(descendants)}
          initiallyExpanded={revealedRows}
          gateTitles={gateTitles}
          waiters={waiters}
          issueHref={issueHref}
          writes={writes}
          emptyMessage={messages.epics.childrenEmpty}
          epicOrderHref={(epicId) => graphHref({ kind: "epic", id: epicId })}
          epicProgress={progress}
        />
      )}
    </div>
  );
}
