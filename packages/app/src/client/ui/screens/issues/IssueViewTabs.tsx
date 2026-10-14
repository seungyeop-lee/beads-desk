import Link from "next/link";
import {
  VIEW_STATES,
  type WorkState,
  type WorkStateGroup,
} from "@/client/modules/issues/domain/workState";
import { workStateTone } from "@/client/ui/issues/issueLabels";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/** 보기 탭을 담는 주소 query 이름입니다. 지금 화면의 개수 카드도 이 주소로 이동합니다. */
export const VIEW_PARAM = "view";

type Props = {
  /** null이면 전체 보기입니다. */
  view: WorkState | null;
  /** 유형과 검색으로 좁힌 뒤의 묶음입니다. 탭의 개수는 이 묶음의 이슈 수입니다. */
  groups: WorkStateGroup[];
};

/** 작업 상태 하나를 골라 보는 탭입니다. 고른 탭은 주소에 남아 뒤로 가기와 새로고침에도 유지됩니다. */
export function IssueViewTabs({ view, groups }: Props) {
  const messages = useMessages();
  const countOf = (state: WorkState) =>
    groups.find((group) => group.state === state)?.issues.length ?? 0;
  const tabs = [
    {
      state: null,
      label: messages.issues.allStatuses,
      count: groups.reduce((sum, group) => sum + group.issues.length, 0),
      href: "/issues",
    },
    ...VIEW_STATES.map((state) => ({
      state,
      label: messages.workStates.labels[state],
      count: countOf(state),
      href: `/issues?${VIEW_PARAM}=${state}`,
    })),
  ];

  return (
    <nav
      className="flex items-end gap-1 border-b border-base-300"
      aria-label={messages.issues.views}
    >
      {tabs.map((tab) => {
        const current = tab.state === view;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            scroll={false}
            aria-current={current ? "page" : undefined}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 pt-1 pb-2.5 text-sm font-medium transition-colors ${current ? "border-base-content text-base-content" : "border-transparent text-base-content/55 hover:text-base-content"}`}
          >
            {tab.state && <span className={`tone-dot ${workStateTone(tab.state)}`} />}
            {tab.label}
            <span className="font-mono text-xs font-normal text-base-content/45 tabular-nums">
              {tab.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
