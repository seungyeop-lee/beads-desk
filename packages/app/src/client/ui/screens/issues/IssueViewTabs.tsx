import Link from "next/link";
import {
  BOTTLENECK_VIEW,
  ISSUE_VIEWS,
  type IssueView,
} from "@/client/modules/issues/domain/issueView";
import type { WorkStateGroup } from "@/client/modules/issues/domain/workState";
import { useWorkspaceHref } from "@/client/ui/address/workspaceAddress";
import { BOTTLENECK_TONE, workStateTone } from "@/client/ui/issues/issueLabels";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { issueListHref, type IssueListAddress } from "@/client/ui/address/issueListAddress";

type Props = {
  /** null이면 전체 보기입니다. */
  view: IssueView | null;
  /** 탭을 바꿔도 유지하는 조건입니다. */
  filters: Omit<IssueListAddress, "view">;
  /** 유형과 검색으로 좁힌 뒤의 묶음입니다. 작업 상태 탭의 개수는 이 묶음의 이슈 수입니다. */
  groups: WorkStateGroup[];
  /** 같은 조건으로 좁힌 병목 후보 수입니다. */
  bottleneckCount: number;
};

/** 작업 상태 하나나 병목 후보를 골라 보는 탭입니다. 고른 탭은 주소에 남아 뒤로 가기와 새로고침에도 유지됩니다. */
export function IssueViewTabs({ view, filters, groups, bottleneckCount }: Props) {
  const messages = useMessages();
  const workspaceHref = useWorkspaceHref();
  const tabOf = (tabView: IssueView) =>
    tabView === BOTTLENECK_VIEW
      ? { label: messages.focus.bottlenecks.title, tone: BOTTLENECK_TONE, count: bottleneckCount }
      : {
          label: messages.workStates.labels[tabView],
          tone: workStateTone(tabView),
          count: groups.find((group) => group.state === tabView)?.issues.length ?? 0,
        };
  const tabs = [
    {
      view: null,
      label: messages.issues.allStatuses,
      tone: null,
      count: groups.reduce((sum, group) => sum + group.issues.length, 0),
      href: workspaceHref(issueListHref(filters)),
    },
    ...ISSUE_VIEWS.map((tabView) => ({
      view: tabView,
      ...tabOf(tabView),
      href: workspaceHref(issueListHref({ ...filters, view: tabView })),
    })),
  ];

  // 탭 줄의 아래 선은 border가 아니라 안쪽 그림자로 그려서, 고른 탭의 밑줄이 탭 줄 안에서 그 선을 덮게 합니다.
  // border를 쓰고 탭을 1px 내려 겹치면, 가로 스크롤 때문에 넘친 내용을 잘라 내는 탭 줄이 그 1px만큼 세로로도 스크롤됩니다.
  // 선은 스크롤되는 nav가 아니라 탭 묶음에 그립니다. 스크롤바가 자리를 차지하는 브라우저에서는 가로 스크롤바가 nav 안쪽
  // 맨 아래에 그려지므로, nav에 그리면 밑줄과 선 사이에 스크롤바가 끼어 밑줄이 선에서 떨어져 보입니다.
  return (
    <nav className="overflow-x-auto" aria-label={messages.issues.views}>
      <div className="flex w-max min-w-full items-end gap-1 shadow-[inset_0_-1px_0_var(--color-base-300)]">
        {tabs.map((tab) => {
          const current = tab.view === view;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              scroll={false}
              aria-current={current ? "page" : undefined}
              className={`flex shrink-0 items-center whitespace-nowrap gap-2 border-b-2 px-3 pt-1 pb-2.5 text-sm font-medium transition-colors ${current ? "border-base-content text-base-content" : "border-transparent text-emphasis-60 hover:text-base-content"}`}
            >
              {tab.tone && <span className={`tone-dot ${tab.tone}`} />}
              {tab.label}
              <span className="font-mono text-xs font-normal text-emphasis-50 tabular-nums">
                {tab.count}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
