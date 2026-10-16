import type { Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { Fragment, useMemo } from "react";
import { epicPlan } from "@/client/modules/graph/domain/epicPlan";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import { workState } from "@/client/modules/issues/domain/workState";
import { workStateTone } from "@/client/ui/issues/issueLabels";
import { IssueTypeTag } from "@/client/ui/issues/IssueTypeTag";
import { WaiterCount } from "@/client/ui/issues/WaiterCount";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import type { GraphData } from "@/shared/contract/graph";
import { waiterCounts } from "@/shared/domain/issues/waiterCounts";
import { layeredLayout, PLAN_NODE_HEIGHT } from "./graphLayout";
import { IssueGraph } from "./IssueGraph";

type Props = {
  data: GraphData;
  epicId: string;
  issueHref: (issueId: string) => string;
};

/** 에픽의 후손 이슈를 단계로 나눠 그리고, 진행 요약, 순환 경고, 선후 관계가 없는 이슈를 함께 보입니다. */
export function EpicPlanGraph({ data, epicId, issueHref }: Props) {
  const messages = useMessages();
  const plan = useMemo(() => epicPlan(data, epicId), [data, epicId]);
  // 대기 수는 다른 화면과 같은 값을 보이도록 에픽 밖 이슈까지 담은 전체 목록으로 셉니다.
  const waiters = useMemo(() => waiterCounts(data.issues), [data]);
  const layout = useMemo(() => layeredLayout(plan.order, PLAN_NODE_HEIGHT), [plan]);
  const graphPlan = useMemo(
    () => ({ stages: plan.stages, outside: plan.outside, waiters }),
    [plan, waiters],
  );
  const { total, current } = plan.stages;

  return (
    <>
      {total > 0 && (
        <p className="text-sm text-base-content/70">
          {current === null
            ? messages.graph.allStagesDone(total)
            : messages.graph.progress(current + 1, total)}
        </p>
      )}

      {plan.order.cycles.length > 0 && (
        <div role="alert" className="alert alert-warning alert-soft flex-col items-start gap-1">
          <span>{messages.graph.cycle}</span>
          <ul className="flex flex-col gap-0.5 font-mono text-xs">
            {plan.order.cycles.map((path) => (
              <li key={path.join(" ")} aria-label={messages.graph.cyclePath}>
                {path.map((id, at) => (
                  <Fragment key={at}>
                    {at > 0 && <span aria-hidden> → </span>}
                    <Link href={issueHref(id)} scroll={false} className="link link-hover">
                      {id}
                    </Link>
                  </Fragment>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-4">
        {layout.nodes.length > 0 ? (
          <IssueGraph layout={layout} issueHref={issueHref} plan={graphPlan} />
        ) : (
          <p className="flex-1 self-start rounded-box border border-dashed border-base-300 px-6 py-10 text-center text-sm text-base-content/55">
            {messages.graph.empty.epic}
          </p>
        )}
        {plan.unordered.length > 0 && (
          <UnorderedIssues issues={plan.unordered} issueHref={issueHref} waiters={waiters} />
        )}
      </div>
    </>
  );
}

/** blocks 관계가 없는 후손 이슈의 제목을 끝까지 보이고, 목록만 따로 세로로 스크롤합니다. */
function UnorderedIssues({
  issues,
  issueHref,
  waiters,
}: {
  issues: Issue[];
  issueHref: (issueId: string) => string;
  waiters: ReadonlyMap<string, number>;
}) {
  const messages = useMessages();
  return (
    <section
      aria-label={messages.graph.unordered}
      className="flex w-80 shrink-0 flex-col overflow-hidden rounded-box border border-base-300 bg-base-200/40"
    >
      <header className="flex flex-col gap-1 px-3 pt-3 pb-2">
        <h2 className="text-sm font-semibold">
          {messages.graph.unordered}{" "}
          <span className="font-normal text-base-content/45 tabular-nums">{issues.length}</span>
        </h2>
        <p className="text-xs text-base-content/55">{messages.graph.unorderedHint}</p>
      </header>
      <ul className="flex flex-col divide-y divide-base-300 overflow-y-auto px-3 pb-3">
        {issues.map((issue) => (
          <li key={issue.id} className="shrink-0">
            <UnorderedIssueRow
              issue={issue}
              href={issueHref(issue.id)}
              waiters={waiters.get(issue.id) ?? 0}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function UnorderedIssueRow({
  issue,
  href,
  waiters,
}: {
  issue: Issue;
  href: string;
  waiters: number;
}) {
  const messages = useMessages();
  const state = workState(issue);
  return (
    <Link
      href={href}
      scroll={false}
      title={issue.id}
      className={`flex flex-col gap-1 rounded-lg px-2 py-3 text-xs transition hover:bg-base-200 ${state === "closed" ? "opacity-50" : ""}`}
    >
      <span className="flex items-center gap-1.5 text-base-content/55">
        <IssueTypeTag issueType={issue.issueType} />
        <span aria-hidden>·</span>
        <span className={`tone-dot ${workStateTone(state)}`} />
        <span className="min-w-0 truncate">{messages.workStates.labels[state]}</span>
        <span className="ml-auto shrink-0 font-mono">{shortIssueId(issue.id)}</span>
      </span>
      <span className="text-sm leading-snug font-medium wrap-anywhere text-base-content">
        {issue.title}
      </span>
      <WaiterCount count={waiters} className="self-end" />
    </Link>
  );
}
