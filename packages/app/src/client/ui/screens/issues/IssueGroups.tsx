import type { Issue } from "@beads-desk/bd/issue";
import { useState } from "react";
import type { HumanGateTitles } from "@/client/modules/humanGates/domain/humanGateBlockers";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import type { WorkState, WorkStateGroup } from "@/client/modules/issues/domain/workState";
import { ChevronRightIcon } from "@/client/ui/designSystem/icons";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { workStateTone } from "@/client/ui/issues/issueLabels";
import { IssueTable } from "@/client/ui/issues/IssueTable";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

type Props = {
  groups: WorkStateGroup[];
  /** 막고 있는 이슈의 제목을 찾을 전체 목록입니다. 선행 이슈가 다른 묶음에 있어도 제목을 보입니다. */
  titleSource: Issue[];
  humanGateTitles: HumanGateTitles;
  waiters: ReadonlyMap<string, number>;
  issueHref: (issueId: string) => string;
  writes: IssueWrites;
};

/** 전체 보기에서 작업 상태 묶음마다 표를 나눠 보입니다. 처음에는 닫힘 묶음만 접어 둡니다. */
export function IssueGroups({
  groups,
  titleSource,
  humanGateTitles,
  waiters,
  issueHref,
  writes,
}: Props) {
  const messages = useMessages();
  const [collapsed, setCollapsed] = useState<ReadonlySet<WorkState>>(new Set(["closed"]));
  if (groups.length === 0) return <EmptyState message={messages.issueTable.empty} />;

  // 열 이름은 펼친 묶음 가운데 맨 위의 표에만 보입니다.
  const headerGroup = groups.find((group) => !collapsed.has(group.state))?.state;
  const toggle = (state: WorkState) => {
    const next = new Set(collapsed);
    if (!next.delete(state)) next.add(state);
    setCollapsed(next);
  };

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => {
        const expanded = !collapsed.has(group.state);
        const label = messages.workStates.labels[group.state];
        return (
          <section key={group.state} aria-label={label} className="flex flex-col gap-2">
            <h2 className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1">
              <button
                type="button"
                className="flex items-baseline gap-2 text-[15px] font-bold"
                aria-expanded={expanded}
                aria-label={messages.issues.toggleGroup(label, expanded)}
                onClick={() => toggle(group.state)}
              >
                <ChevronRightIcon
                  width={14}
                  height={14}
                  className={`self-center text-base-content/50 transition-transform ${expanded ? "rotate-90" : ""}`}
                />
                <span className={`tone-dot ${workStateTone(group.state)} self-center`} />
                {label}
                <span className="font-mono text-xs font-normal text-base-content/50">
                  {group.issues.length}
                </span>
              </button>
              <span className="text-xs text-base-content/50">
                {messages.workStates.hints[group.state]}
              </span>
            </h2>
            {expanded && (
              <IssueTable
                issues={group.issues}
                issueHref={issueHref}
                writes={writes}
                titleSource={titleSource}
                humanGateTitles={humanGateTitles}
                waiters={waiters}
                hideHeader={group.state !== headerGroup}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
