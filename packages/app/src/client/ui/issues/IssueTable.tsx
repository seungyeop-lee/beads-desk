import { HUMAN_LABEL, type Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { memo, useMemo, useState, type ReactNode } from "react";
import type { ChildProgress } from "@/client/modules/epics/domain/epicsView";
import type { GateTitles } from "@/client/modules/humanGates/domain/humanGateBlockers";
import { issueEdits } from "@/client/modules/issues/application/issueEdits";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { visibleTreeRows, type IssueTreeRow } from "@/client/modules/issues/domain/issueListView";
import { BlockerLine } from "./BlockerLine";
import { HumanDecisionChip } from "./HumanDecisionChip";
import { LabelChip } from "./IssueChip";
import { CopyIssueIdButton } from "./CopyIssueIdButton";
import { EpicProgress } from "./EpicProgress";
import { DeferralLine } from "./DeferralLine";
import { statusPrompts } from "./fields/statusPrompts";
import { PrioritySelect } from "./fields/PrioritySelect";
import { StatusSelect } from "./fields/StatusSelect";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { ChevronRightIcon } from "@/client/ui/designSystem/icons";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { IssueTypeTag } from "./IssueTypeTag";
import { WaiterCount } from "./WaiterCount";

type Props = (
  | { issues: Issue[]; tree?: never }
  | {
      issues?: never;
      /** 주면 하위 행을 상위 행 아래에 들여 쓰고, 하위가 있는 행마다 접고 펼 수 있게 합니다. 처음에는 모두 접혀 있습니다. */
      tree: readonly IssueTreeRow[];
    }
) & {
  issueHref: (issueId: string) => string;
  writes: IssueWrites;
  /** 없으면 필터에 맞는 이슈가 없다고 안내합니다. */
  emptyMessage?: string;
  /** 막고 있는 이슈의 제목을 찾을 목록입니다. 없으면 표의 이슈에서 찾습니다. */
  titleSource?: Issue[];
  /** 열린 gate의 id마다 제목과 human gate인지입니다. bd list가 gate를 돌려주지 않아 따로 받습니다. */
  gateTitles: GateTitles;
  /** 이슈 id마다 대기 수입니다. 없으면 대기 수를 보이지 않습니다. */
  waiters?: ReadonlyMap<string, number>;
  /** 묶음마다 표를 나눠 보일 때, 첫 표가 아니면 열 이름을 감춥니다. 열 너비는 그대로 맞춥니다. */
  hideHeader?: boolean;
  /** 주면 유형이 epic인 행의 의존 칸에 의존 수 대신, 이 주소로 그 에픽의 순서 보기를 여는 링크를 보입니다. */
  epicOrderHref?: (epicId: string) => string;
  /** 주면 유형이 epic인 행의 제목 옆에 하위 행 수 대신 이 진행도를 막대와 `닫힌 수/전체 수 · %`로 보입니다. 없는 에픽은 하위 이슈가 없는 것으로 봅니다. */
  epicProgress?: ReadonlyMap<string, ChildProgress>;
};

/** ID를 누르면 전체 ID를 복사하고, 제목을 누르면 상세를 엽니다. 상태와 우선순위는 표에서 바로 고치고, 라벨과 담당자는 상세에서만 고칩니다. */
export const IssueTable = memo(function IssueTable({
  issues,
  tree,
  issueHref,
  writes,
  emptyMessage,
  titleSource,
  gateTitles,
  waiters,
  hideHeader,
  epicOrderHref,
  epicProgress,
}: Props) {
  const messages = useMessages();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const rows = useMemo(
    () => tree ?? issues.map((issue) => ({ issue, depth: 0, childCount: 0 })),
    [tree, issues],
  );
  const titles = useMemo(
    () =>
      new Map(
        (titleSource ?? rows.map((row) => row.issue)).map((issue) => [issue.id, issue.title]),
      ),
    [titleSource, rows],
  );
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage ?? messages.issueTable.empty} />;
  }
  return (
    <div className="@container surface min-w-0 max-w-full overflow-x-auto">
      {/* 제목 열은 표 폭에서 나머지 열의 폭을 뺀 만큼 차지합니다. 표 영역이 64rem보다 좁으면 표를 64rem으로 넓히고
          상태·우선순위·라벨·의존 열(30rem)은 가로 스크롤로 봅니다. 표 영역이 34rem보다 좁으면 64rem 대신 영역 폭(100cqw)에 그 네 열의 폭만 더해
          ID와 제목 열이 스크롤하지 않아도 영역 안에 다 보이게 합니다. 이때는 유형 열(6.5rem)을 감추고 유형을 제목 앞에 보여, 그만큼 제목 칸을 넓힙니다. */}
      <table className="table w-[max(100cqw,min(100cqw_+_30rem,64rem))] table-fixed">
        <thead className={hideHeader ? "invisible [&_th]:py-0 [&_th]:leading-[0]" : undefined}>
          <tr>
            <th className="w-24">ID</th>
            <th className="w-26 @max-[34rem]:hidden">{messages.issue.type}</th>
            <th>{messages.issue.title}</th>
            <th className="w-32">{messages.issue.status}</th>
            <th className="w-32">{messages.issue.priority}</th>
            <th className="w-36">{messages.issue.labels}</th>
            <th className="w-20 text-right">{messages.issue.dependencyCount}</th>
          </tr>
        </thead>
        <tbody>
          {(tree ? visibleTreeRows(rows, expanded) : rows).map((row) => (
            <IssueRow
              key={row.issue.id}
              issue={row.issue}
              outline={
                tree && {
                  depth: row.depth,
                  childCount: row.childCount,
                  expanded: expanded.has(row.issue.id),
                  onToggle: () => {
                    const next = new Set(expanded);
                    if (!next.delete(row.issue.id)) next.add(row.issue.id);
                    setExpanded(next);
                  },
                }
              }
              issueHref={issueHref}
              titleOf={(id) => titles.get(id)}
              gateTitles={gateTitles}
              waiters={waiters?.get(row.issue.id) ?? 0}
              writes={writes}
              epicOrderHref={epicOrderHref}
              epicProgress={epicProgress}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});

const NO_CHILDREN: ChildProgress = { closed: 0, total: 0 };

/** tree로 그릴 때 제목 칸의 들여쓰기와 접기 버튼을 정합니다. */
type RowOutline = {
  depth: number;
  childCount: number;
  expanded: boolean;
  onToggle: () => void;
};

type RowProps = {
  issue: Issue;
  outline?: RowOutline | undefined;
  issueHref: (issueId: string) => string;
  /** 막고 있는 이슈의 제목을 표에서 찾습니다. */
  titleOf: (issueId: string) => string | undefined;
  gateTitles: GateTitles;
  waiters: number;
  writes: IssueWrites;
  epicOrderHref: ((epicId: string) => string) | undefined;
  epicProgress: ReadonlyMap<string, ChildProgress> | undefined;
};

function IssueRow({
  issue,
  outline,
  issueHref,
  titleOf,
  gateTitles,
  waiters,
  writes,
  epicOrderHref,
  epicProgress,
}: RowProps) {
  const { update, changeStatus } = issueEdits(writes, issue.id);
  const href = issueHref(issue.id);
  const messages = useMessages();
  return (
    <tr className="group hover:bg-base-200/60">
      <td>
        <CopyIssueIdButton
          issueId={issue.id}
          short
          className="rounded text-xs text-base-content/55"
        />
      </td>
      <td className="text-sm @max-[34rem]:hidden">
        <IssueTypeTag issueType={issue.issueType} />
      </td>
      <td>
        <TitleOutline issueId={issue.id} outline={outline}>
          <span className="mr-2 text-sm @min-[34rem]:hidden">
            <IssueTypeTag issueType={issue.issueType} />
          </span>
          <Link
            className="font-medium wrap-anywhere decoration-base-content/30 underline-offset-4 hover:underline"
            href={href}
            scroll={false}
          >
            {issue.title || messages.common.untitled}
          </Link>
          <HumanDecisionChip issue={issue} className="ml-2" />
          <WaiterCount count={waiters} className="ml-2" />
          {epicProgress && issue.issueType === "epic" ? (
            <span className="ml-2 inline-flex items-center gap-1.5 align-middle">
              <EpicProgress
                epicId={issue.id}
                {...(epicProgress.get(issue.id) ?? NO_CHILDREN)}
                barClassName="w-16"
              />
            </span>
          ) : (
            outline &&
            outline.childCount > 0 && (
              <span className="ml-2 font-mono text-xs text-base-content/45 tabular-nums">
                {messages.issueTable.childCount(outline.childCount)}
              </span>
            )
          )}
          {issue.blockedBy && (
            <BlockerLine
              issueId={issue.id}
              blockedBy={issue.blockedBy}
              titleOf={titleOf}
              gateTitles={gateTitles}
              issueHref={issueHref}
            />
          )}
          <DeferralLine issue={issue} />
        </TitleOutline>
      </td>
      <td>
        <StatusSelect
          aria-label={messages.issueTable.statusOf(issue.id)}
          value={issue.status}
          issueType={issue.issueType}
          onChange={(status) => changeStatus(status, statusPrompts)}
        />
      </td>
      <td>
        <PrioritySelect
          aria-label={messages.issueTable.priorityOf(issue.id)}
          value={issue.priority}
          onChange={(priority) => update({ priority })}
        />
      </td>
      <LabelCell labels={issue.labels} />
      {epicOrderHref && issue.issueType === "epic" ? (
        // 의존 열(5rem)의 좌우 여백을 남기면 영어 버튼 문구가 칸 밖으로 넘치므로, 이 칸만 여백을 없앱니다.
        <td className="px-0 text-right">
          <Link
            className="btn btn-ghost btn-xs rounded-full whitespace-nowrap"
            href={epicOrderHref(issue.id)}
          >
            {messages.graph.epicOrder}
          </Link>
        </td>
      ) : (
        <td
          className={`text-right font-mono text-xs tabular-nums ${issue.dependencyCount + issue.dependentCount === 0 ? "text-base-content/30" : ""}`}
          title={messages.issueTable.dependencyCounts(issue.dependencyCount, issue.dependentCount)}
        >
          {issue.dependencyCount} / {issue.dependentCount}
        </td>
      )}
    </tr>
  );
}

/**
 * 첫 라벨만 칩으로 보이고 나머지는 +N으로 줄이며, 칸에 마우스를 올리면 모든 라벨 이름을 보입니다.
 * human 라벨은 제목 옆의 판단 기다림 표시와 겹쳐 보이므로 칸에도 +N 수에도 넣지 않습니다.
 */
function LabelCell({ labels }: { labels: readonly string[] }) {
  const messages = useMessages();
  const shown = labels.filter((label) => label !== HUMAN_LABEL);
  const [first] = shown;
  if (first === undefined) {
    return (
      <td>
        <span className="text-sm text-base-content/50">{messages.common.none}</span>
      </td>
    );
  }
  return (
    <td title={shown.join(", ")}>
      <div className="flex items-center gap-1">
        {/* 칩은 기본으로 줄어들지 않으므로, 긴 라벨 이름이 +N을 칸 밖으로 밀지 않게 칩만 줄여 말줄임으로 보입니다. */}
        <LabelChip label={first} className="block min-w-0 shrink truncate leading-5" />
        {shown.length > 1 && (
          <span className="shrink-0 text-xs text-base-content/55 tabular-nums">
            +{shown.length - 1}
          </span>
        )}
      </div>
    </td>
  );
}

/**
 * 하위 행은 상위 행의 접기 버튼 아래에서 짧게 꺾인 선을 그어 상위 행에 잇습니다.
 * 깊이마다 접기 버튼과 같은 폭의 칸을 하나씩 두고, 하위가 없는 행은 버튼 자리에 점을 찍어 같은 깊이의 제목이 한 줄에 맞춰집니다.
 */
function TitleOutline({
  issueId,
  outline,
  children,
}: {
  issueId: string;
  outline: RowOutline | undefined;
  children: ReactNode;
}) {
  const messages = useMessages();
  if (!outline) return children;
  return (
    <div className="flex items-start gap-1">
      {Array.from({ length: Math.max(outline.depth - 1, 0) }, (_, level) => (
        <span key={level} className="w-6 shrink-0" aria-hidden="true" />
      ))}
      {outline.depth > 0 && (
        <span
          className="-mt-2 ml-3 h-[1.0625rem] w-3 shrink-0 rounded-bl border-b border-l border-base-content/15"
          aria-hidden="true"
        />
      )}
      {outline.childCount > 0 ? (
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square -my-0.5 shrink-0 text-base-content/50"
          aria-expanded={outline.expanded}
          aria-label={messages.issueTable.toggleChildren(issueId, outline.expanded)}
          onClick={outline.onToggle}
        >
          <ChevronRightIcon
            width={14}
            height={14}
            className={`transition-transform ${outline.expanded ? "rotate-90" : ""}`}
          />
        </button>
      ) : (
        <span className="-ml-1 flex w-7 shrink-0 justify-center pl-1" aria-hidden="true">
          {outline.depth > 0 && (
            <span className="mt-[7px] size-1.5 rounded-full bg-base-content/30" />
          )}
        </span>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
