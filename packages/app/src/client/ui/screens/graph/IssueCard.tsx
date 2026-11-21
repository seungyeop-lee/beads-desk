import { type Issue, isOpenHumanGateLink } from "@beads-desk/bd/issue";
import type { CardSections } from "@/client/modules/graph/domain/graphLayout";
import { CoveredIssueRow } from "@/client/ui/issues/CoveredIssueRow";
import { GraphIssueHeading } from "@/client/ui/issues/GraphIssueHeading";
import { HUMAN_DECISION_TONE } from "@/client/ui/issues/issueLabels";
import { WaiterCount } from "@/client/ui/issues/WaiterCount";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { IssueCardSection } from "./IssueCardSection";

/** 에픽 계획 보기에서만 카드 아래 줄에 보이는 표시입니다. */
type PlanMarks = { outside: boolean; waiters: number };

/** 카드 링크는 바탕 전체를 덮고, 그 위의 ID 복사 단추와 구역별 이슈 링크는 독립적으로 동작합니다. */
export function IssueCard({
  issue,
  issueHref,
  sections,
  plan,
  centerId,
}: {
  issue: Issue;
  issueHref: (issueId: string) => string;
  sections?: CardSections;
  plan?: PlanMarks;
  centerId?: string;
}) {
  const messages = useMessages();
  const closed = issue.status === "closed";
  const waiting =
    sections?.gates.reduce((count, gate) => count + Number(isOpenHumanGateLink(gate)), 0) ?? 0;
  const border = waiting
    ? `${HUMAN_DECISION_TONE} border-lavender-line ring-1 ring-lavender-line aria-[current=true]:outline-2 aria-[current=true]:outline-offset-2 aria-[current=true]:outline-(--tone)`
    : "border-base-300 hover:border-base-content/30";
  return (
    // React Flow는 끌기, 선택, 클릭 handler가 없는 노드에 pointer-events: none을 걸므로 카드에서 다시 켭니다.
    // nopan은 카드를 누를 때 그래프가 함께 끌려 움직이지 않게 하는 React Flow의 class입니다.
    // 테두리와 강조는 카드 전체를 덮는 링크에 그립니다. 카드의 투명한 테두리까지 덮도록 링크를 1px 넓힙니다.
    <CoveredIssueRow
      className={`nopan pointer-events-auto flex size-full flex-col gap-1 rounded-lg border border-transparent px-3 py-2 text-xs ${closed ? "bg-base-200" : "bg-base-100"}`}
      coverClassName={`-inset-px rounded-lg border transition hover:shadow-sm aria-[current=true]:shadow-md aria-[current=true]:ring-2 aria-[current=true]:ring-primary ${border} ${plan?.outside ? "border-dashed" : ""}`}
      coverTooltip={issue.id}
      issueId={issue.id}
      title={issue.title}
      cover={{ href: issueHref(issue.id) }}
      current={issue.id === centerId}
    >
      <GraphIssueHeading issue={issue} variant="node" />
      <span
        className={`text-sm leading-snug wrap-anywhere whitespace-pre-wrap font-medium ${closed ? "text-emphasis-50 line-through" : "text-base-content"}`}
      >
        {issue.title}
      </span>
      {sections && sections.gates.length > 0 && (
        <IssueCardSection
          label={messages.graph.gateSection(sections.gates.length)}
          issues={sections.gates}
          issueHref={issueHref}
          centerId={centerId}
          waiting={waiting}
        />
      )}
      {sections && sections.related.length > 0 && (
        <IssueCardSection
          label={messages.graph.relatedSection(sections.related.length)}
          issues={sections.related}
          issueHref={issueHref}
          centerId={centerId}
          showType
        />
      )}
      {plan && (
        <span className="mt-auto flex items-center gap-1.5 text-emphasis-60">
          {plan.outside && (
            <span
              className="relative"
              data-tooltip={messages.graph.outsideHint}
              aria-description={messages.graph.outsideHint}
            >
              {messages.graph.outside}
            </span>
          )}
          <WaiterCount count={plan.waiters} className="relative ml-auto" />
        </span>
      )}
    </CoveredIssueRow>
  );
}
