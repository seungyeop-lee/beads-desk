import Link from "next/link";
import { useId } from "react";
import type { GateTitles } from "@/client/modules/gates/domain/humanGateBlockers";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { CopyIssueIdButton } from "@/client/ui/issues/CopyIssueIdButton";
import { EpicProgressBar, epicPercent } from "@/client/ui/issues/EpicProgress";
import { statusLabel, statusTone } from "@/client/ui/issues/issueLabels";
import type { EpicSummary } from "@/shared/contract/epics";
import { ChevronRightIcon } from "@/client/ui/designSystem/icons";
import { useGraphHref } from "@/client/ui/screens/graph/useGraphHref";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { EpicDescendants } from "./EpicDescendants";

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

export function EpicSection({
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
  const titleId = useId();
  return (
    <article className="surface" aria-labelledby={titleId}>
      <header className="grid grid-cols-[2rem_3rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3 py-2 xl:flex xl:gap-4 pr-5 pl-3">
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
          id={titleId}
          className="min-w-0 grow text-[15px] wrap-anywhere font-semibold decoration-base-content/30 underline-offset-4 hover:underline"
          href={issueHref(epic.id)}
          scroll={false}
        >
          {epic.title || messages.common.untitled}
        </Link>
        {/* md 이상에서는 오른쪽 조작마다 폭을 고정해, 상태나 개수의 글자 폭이 달라도 카드끼리 열 위치가 같게 합니다.
            md보다 좁은 창에서는 고정한 폭이 둘째 줄에 다 들어가지 않아 조작이 줄바꿈되므로 고정하지 않습니다. */}
        <div className="col-span-full flex flex-wrap items-center justify-end gap-3 xl:contents">
          <span className="flex shrink-0 md:min-w-24">
            <span className={`chip ${statusTone(epic.status)}`}>
              {statusLabel(messages, epic.status)}
            </span>
          </span>
          {epic.status === "closed" ? (
            <ClosedEpicProgress
              closedAt={epic.closedAt}
              closed={closedChildren}
              total={totalChildren}
            />
          ) : (
            <>
              <EpicProgressBar
                epicId={epic.id}
                closed={closedChildren}
                total={totalChildren}
                className="w-40 min-w-24 shrink md:shrink-0"
              />
              <EpicCount
                closed={closedChildren}
                total={totalChildren}
                percent={epicPercent(closedChildren, totalChildren)}
              />
            </>
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
    </article>
  );
}

/**
 * 닫힌 에픽은 진행률이 거의 항상 100%라, 막대 대신 닫은 날짜와 닫힌 하위 이슈 수를 보입니다.
 * md 이상에서는 닫은 날짜가 없어도 막대 열의 자리를 비워 두어, 하위 이슈 수가 열린 에픽의 분수 열에 놓이게 합니다.
 */
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
      {closedAt === null ? (
        <span className="hidden w-40 shrink-0 md:block" />
      ) : (
        <time
          className="shrink-0 whitespace-nowrap text-xs text-base-content/55 md:w-40"
          dateTime={new Date(closedAt).toISOString()}
        >
          {messages.epics.closedOn(
            new Date(closedAt).toLocaleDateString(locale, { dateStyle: "medium" }),
          )}
        </time>
      )}
      <EpicCount closed={closed} total={total} percent={null} />
    </>
  );
}

/**
 * 진행 개수를 분수 열과 퍼센트 열로 나눠 각 열을 오른쪽에 맞추므로, 자릿수가 달라도 카드끼리 분수의 끝과 가운뎃점 위치가 같습니다.
 * 닫힌 에픽은 퍼센트를 보이지 않지만 퍼센트 열의 자리는 남겨 둡니다.
 */
function EpicCount({
  closed,
  total,
  percent,
}: {
  closed: number;
  total: number;
  percent: number | null;
}) {
  const messages = useMessages();
  return (
    <span
      title={messages.epics.closedChildCount}
      className="flex shrink-0 gap-1.5 whitespace-nowrap font-mono text-xs text-base-content/55 tabular-nums"
    >
      <span className="w-14 text-right">
        {closed}/{total}
      </span>
      <span className="flex w-11 justify-between">
        {percent !== null && (
          <>
            <span>·</span>
            <span>{percent}%</span>
          </>
        )}
      </span>
    </span>
  );
}
