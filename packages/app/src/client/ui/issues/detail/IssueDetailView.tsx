import type { IssueDetail } from "@beads-desk/bd/issue";
import Link from "next/link";
import type { GraphScope } from "@/client/modules/graph/domain/graphScope";
import { issueEdits } from "@/client/modules/issues/application/issueEdits";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { hasGraphLink, linkedIssues } from "@/client/modules/issues/domain/issueRelations";
import { statusPrompts } from "../fields/statusPrompts";
import { DueAtField } from "../fields/DueAtField";
import { EditableText } from "../fields/EditableText";
import { PrioritySelect } from "../fields/PrioritySelect";
import { StatusSelect } from "../fields/StatusSelect";
import { TrashIcon } from "@/client/ui/designSystem/icons";
import { useGraphHref } from "@/client/ui/address/useGraphHref";
import { ClaimButton } from "../ClaimButton";
import { formatTime, deferUntilLabel } from "../issueTime";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { BlockerBanner } from "./BlockerBanner";
import { BODY_FIELDS } from "@/shared/domain/issues/bodyFields";
import { CloseAsReplacedForm } from "./CloseAsReplacedForm";
import { DependencyList } from "./DependencyList";
import { DiscussionTabs } from "./DiscussionTabs";
import { EditableMarkdown } from "./EditableMarkdown";
import { HumanDecisionPanel } from "./HumanDecisionPanel";
import { HumanGatePanel } from "./HumanGatePanel";
import { LabelEditor } from "./LabelEditor";
import type { ListedIssues } from "./listedIssues";
import { RelationAddForm } from "./RelationAddForm";

type Props = {
  issue: IssueDetail;
  writes: IssueWrites;
  listedIssues?: ListedIssues;
  /** true면 상세를 연 뒤 human gate 응답 칸이 보이도록 스크롤합니다. */
  scrollToHumanGate?: boolean;
  issueHref: (issueId: string) => string;
  onDeleted: () => void;
};

export function IssueDetailView({
  issue,
  writes,
  listedIssues,
  scrollToHumanGate = false,
  issueHref,
  onDeleted,
}: Props) {
  const { id } = issue;
  const { pending } = writes;
  const edits = issueEdits(writes, id);
  const { update, changeStatus } = edits;
  const locale = useLocale();
  const messages = useMessages();

  /*
   * 주 상세가 넓으면 본문 열과 속성 열을 나란히 둡니다. 옆 패널을 열어 좁아지면 두 열을 display: contents로 풀고,
   * order로 제목 → 핵심 속성 → 본문 → 나머지 속성 순서의 한 열로 바꿔 본문이 주 상세 너비를 모두 씁니다.
   */
  return (
    <div className="@container flex grow flex-col">
      <div className="flex grow flex-col gap-7 px-8 pt-6 pb-10 @4xl:grid @4xl:grid-cols-[minmax(0,1fr)_20rem] @4xl:gap-0 @4xl:p-0">
        <div className="contents @4xl:flex @4xl:min-w-0 @4xl:flex-col @4xl:gap-7 @4xl:px-8 @4xl:pt-6 @4xl:pb-10">
          <div className="order-1 flex flex-col gap-4">
            <BlockerBanner issue={issue} issueHref={issueHref} />
            <EditableText
              label={messages.issue.title}
              value={issue.title}
              placeholder={messages.common.titlePlaceholder}
              required
              className="text-2xl leading-snug font-bold tracking-tight"
              onSave={(title) => update({ title })}
            />
          </div>
          <div className="order-3 flex flex-col gap-7">
            <div className="flex flex-wrap gap-x-2 gap-y-7">
              {BODY_FIELDS.map((field) => (
                <EditableMarkdown
                  key={field}
                  label={messages.issue.bodyFields[field]}
                  value={issue[field]}
                  onSave={(value) => update({ [field]: value })}
                />
              ))}
            </div>
            <HumanDecisionPanel issue={listedIssues?.get(id) ?? issue} writes={writes} />
            <HumanGatePanel
              issue={issue}
              listedIssues={listedIssues}
              issueHref={issueHref}
              scrollIntoView={scrollToHumanGate}
            />
            <DiscussionTabs
              issue={issue}
              disabled={pending}
              onAddComment={(text) => edits.addComment(text)}
            />
          </div>
        </div>

        <aside className="contents text-sm @4xl:flex @4xl:flex-col @4xl:gap-6 @4xl:border-l @4xl:border-base-300 @4xl:bg-base-200/50 @4xl:px-6 @4xl:pt-6 @4xl:pb-8">
          <dl className="order-2 flex flex-wrap items-center gap-x-6 gap-y-3 @4xl:grid @4xl:grid-cols-[4.5rem_minmax(0,1fr)] @4xl:gap-x-3">
            <div className="flex items-center gap-3 @4xl:contents">
              <dt className="caption">
                <label htmlFor="issue-status">{messages.issue.status}</label>
              </dt>
              <dd className="flex items-center gap-2">
                <StatusSelect
                  id="issue-status"
                  value={issue.status}
                  issueType={issue.issueType}
                  onChange={(status) => changeStatus(status, statusPrompts)}
                />
                <ClaimButton issue={issue} writes={writes} />
                {issue.status === "deferred" && (
                  <button
                    type="button"
                    className="btn btn-xs shrink-0"
                    title={messages.deferral.reopenHint}
                    disabled={pending}
                    onClick={() => void changeStatus("open", statusPrompts)}
                  >
                    {messages.deferral.reopen}
                  </button>
                )}
              </dd>
            </div>

            {issue.status === "deferred" && (
              <div className="flex items-center gap-3 @4xl:contents">
                <dt className="caption">{messages.deferral.until}</dt>
                <dd className="tabular-nums">
                  {deferUntilLabel(messages, locale, issue.deferUntil)}
                </dd>
              </div>
            )}

            {issue.closeReason && (
              <div className="order-last flex basis-full items-baseline gap-3 @4xl:order-none @4xl:contents">
                <dt className="caption shrink-0">{messages.issueDetail.closeReason}</dt>
                <dd className="min-w-0 break-words">{issue.closeReason}</dd>
              </div>
            )}

            <div className="flex items-center gap-3 @4xl:contents">
              <dt className="caption">
                <label htmlFor="issue-priority">{messages.issue.priority}</label>
              </dt>
              <dd>
                <PrioritySelect
                  id="issue-priority"
                  value={issue.priority}
                  onChange={(priority) => update({ priority })}
                />
              </dd>
            </div>

            <div className="flex min-w-0 items-center gap-3 @4xl:contents">
              <dt className="caption">{messages.issue.assignee}</dt>
              <dd className="min-w-0">
                <EditableText
                  label={messages.issue.assignee}
                  value={issue.assignee ?? ""}
                  placeholder={messages.common.none}
                  onSave={(assignee) => update({ assignee })}
                />
              </dd>
            </div>

            {/* 편집하면 날짜·시각 입력과 단추가 여러 줄이 되므로, 이름을 가운데가 아니라 첫 줄에 맞춥니다. */}
            <div className="flex min-w-0 items-baseline gap-3 @4xl:contents">
              <dt className="caption @4xl:self-baseline">{messages.issue.dueAt}</dt>
              <dd className="min-w-0 @4xl:self-baseline">
                <DueAtField value={issue.dueAt} onSave={(dueAt) => update({ dueAt })} />
              </dd>
            </div>
          </dl>

          <div className="order-4 flex flex-col gap-6 border-t border-base-300 pt-7 @4xl:border-0 @4xl:pt-0">
            <section className="flex flex-col gap-2">
              <h3 className="caption">{messages.issue.labels}</h3>
              <LabelEditor
                labels={issue.labels}
                disabled={pending}
                onAdd={(label) => edits.addLabel(label)}
                onRemove={(label) => void edits.removeLabel(label)}
              />
            </section>

            <DependencyList
              links={linkedIssues(issue)}
              issueHref={issueHref}
              edit={{
                disabled: pending,
                onRemove: (linked) =>
                  void edits.removeDependency(linked, () =>
                    window.confirm(messages.issueDetail.confirmRemoveDependency(linked.link.id)),
                  ),
              }}
              actions={
                <span className="flex items-center gap-3">
                  {issue.issueType === "epic" && (
                    <GraphLink scope={{ kind: "epic", id }} label={messages.graph.epicOrder} />
                  )}
                  {hasGraphLink(issue) && (
                    <GraphLink
                      scope={{ kind: "center", id }}
                      label={messages.graph.blockingChain}
                    />
                  )}
                </span>
              }
            />
            <RelationAddForm issue={issue} writes={writes} />
            <CloseAsReplacedForm issue={issue} writes={writes} />

            <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-base-300 pt-5 text-xs text-emphasis-60 tabular-nums">
              <dt className="caption">{messages.issueDetail.createdAt}</dt>
              <dd>{formatTime(locale, issue.createdAt)}</dd>
              <dt className="caption">{messages.issueDetail.updatedAt}</dt>
              <dd>{formatTime(locale, issue.updatedAt)}</dd>
              {issue.closedAt !== null && (
                <>
                  <dt className="caption">{messages.issueDetail.closedAt}</dt>
                  <dd>{formatTime(locale, issue.closedAt)}</dd>
                </>
              )}
            </dl>

            <button
              type="button"
              className="btn btn-ghost btn-sm -ml-3 gap-1.5 self-start font-medium text-error"
              disabled={pending}
              onClick={() =>
                void edits.remove(
                  () => window.confirm(messages.issueDetail.confirmDelete(id)),
                  onDeleted,
                )
              }
            >
              <TrashIcon width={15} height={15} />
              {messages.issueDetail.delete}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function GraphLink({ scope, label }: { scope: GraphScope; label: string }) {
  const graphHref = useGraphHref();
  return (
    <Link
      className="btn btn-sm rounded-full border-base-300 bg-base-100 text-sm font-medium shadow-none hover:border-base-content/30"
      href={graphHref(scope)}
      scroll={false}
    >
      {label}
    </Link>
  );
}
