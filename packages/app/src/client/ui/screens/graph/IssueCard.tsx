import type { Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import { workState } from "@/client/modules/issues/domain/workState";
import { workStateTone } from "@/client/ui/issues/issueLabels";
import { IssueTypeTag } from "@/client/ui/issues/IssueTypeTag";
import { WaiterCount } from "@/client/ui/issues/WaiterCount";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/** 에픽 계획 보기에서만 카드 아래 줄에 보이는 표시입니다. */
export type PlanMarks = { outside: boolean; waiters: number };

/**
 * 그래프의 이슈 카드입니다. 카드 전체가 상세 dialog를 여는 링크이고, 감싸는 요소의 크기를 채웁니다.
 * 유형과 작업 상태의 색과 이름은 다른 화면과 같은 기준을 따릅니다.
 * 닫힌 이슈는 어디까지 진행했는지만 알리면 되므로 흐리게 그립니다. 에픽 밖 이슈는 점선 테두리로 흐리게 그립니다.
 */
export function IssueCard({ issue, href, plan }: { issue: Issue; href: string; plan?: PlanMarks }) {
  const messages = useMessages();
  const state = workState(issue);
  const dim = state === "closed" ? "opacity-50" : plan?.outside ? "opacity-70" : "";
  return (
    // React Flow는 끌기, 선택, 클릭 handler가 없는 노드에 pointer-events: none을 걸므로 링크에서 다시 켭니다.
    // nopan은 링크를 누를 때 그래프가 함께 끌려 움직이지 않게 하는 React Flow의 class입니다.
    <Link
      href={href}
      scroll={false}
      title={issue.id}
      className={`nopan pointer-events-auto flex size-full flex-col gap-1 rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-xs transition hover:border-base-content/30 hover:shadow-sm ${plan?.outside ? "border-dashed" : ""} ${dim}`}
    >
      <span className="flex items-center gap-1.5 text-base-content/55">
        <IssueTypeTag issueType={issue.issueType} />
        <span aria-hidden>·</span>
        <span className={`tone-dot ${workStateTone(state)}`} />
        <span className="min-w-0 truncate">{messages.workStates.labels[state]}</span>
        <span className="ml-auto shrink-0 font-mono">{shortIssueId(issue.id)}</span>
      </span>
      <span className="line-clamp-2 text-sm leading-snug font-medium text-base-content">
        {issue.title}
      </span>
      {plan && (
        <span className="mt-auto flex items-center gap-1.5 text-base-content/55">
          {plan.outside && <span title={messages.graph.outsideHint}>{messages.graph.outside}</span>}
          <WaiterCount count={plan.waiters} className="ml-auto" />
        </span>
      )}
    </Link>
  );
}
