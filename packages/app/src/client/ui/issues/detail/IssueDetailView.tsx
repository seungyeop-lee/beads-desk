import type { IssueDetail, IssueLink } from "@beads-desk/bd/issue";
import { issueEdits } from "@/client/modules/issues/application/issueEdits";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import {
  addCommentAction,
  addLabelAction,
  deleteIssueAction,
  removeDependencyAction,
  removeLabelAction,
} from "@/server/web/issues/issueActions";
import { confirmForceClose } from "../fields/confirmForceClose";
import { EditableText } from "../fields/EditableText";
import { PrioritySelect } from "../fields/PrioritySelect";
import { StatusSelect } from "../fields/StatusSelect";
import { TrashIcon } from "@/client/ui/designSystem/icons";
import { formatTime } from "../issueLabels";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { BlockerBanner } from "./BlockerBanner";
import { CommentList } from "./CommentList";
import { DependencyList } from "./DependencyList";
import { EditableMarkdown } from "./EditableMarkdown";
import { LabelEditor } from "./LabelEditor";
import { RelationAddForm } from "./RelationAddForm";

type Props = {
  issue: IssueDetail;
  writes: IssueWrites;
  issueHref: (issueId: string) => string;
  onDeleted: () => void;
};

/** 상세 본문에 차례로 보이는 markdown 필드입니다. */
export const BODY_FIELDS = ["description", "design", "acceptanceCriteria", "notes"] as const;

export function IssueDetailView({ issue, writes, issueHref, onDeleted }: Props) {
  const { id } = issue;
  const { run, pending } = writes;
  const { update, changeStatus } = issueEdits(writes, id);
  const locale = useLocale();
  const messages = useMessages();

  const removeDependency = (link: IssueLink, side: "dependencies" | "dependents") => {
    if (!window.confirm(messages.issueDetail.confirmRemoveDependency(link.id))) return;
    void run(() =>
      side === "dependencies"
        ? removeDependencyAction(id, link.id)
        : removeDependencyAction(link.id, id),
    );
  };

  const remove = async () => {
    if (!window.confirm(messages.issueDetail.confirmDelete(id))) return;
    if ((await run(() => deleteIssueAction(id))).ok) onDeleted();
  };

  /*
   * 주 상세가 넓으면 본문 열과 속성 열을 나란히 둡니다. 옆 패널을 열어 좁아지면 두 열을 display: contents로 풀고,
   * order로 제목 → 핵심 속성 → 본문 → 나머지 속성 순서의 한 열로 바꿔 본문이 주 상세 너비를 모두 쓰게 합니다.
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
            <CommentList
              comments={issue.comments}
              disabled={pending}
              onAdd={async (text) => (await run(() => addCommentAction(id, text))).ok}
            />
          </div>
        </div>

        <aside className="contents text-sm @4xl:flex @4xl:flex-col @4xl:gap-6 @4xl:border-l @4xl:border-base-300 @4xl:bg-base-200/50 @4xl:px-6 @4xl:pt-6 @4xl:pb-8">
          <dl className="order-2 flex flex-wrap items-center gap-x-6 gap-y-3 @4xl:grid @4xl:grid-cols-[4.5rem_minmax(0,1fr)] @4xl:gap-x-3">
            <div className="flex items-center gap-3 @4xl:contents">
              <dt className="caption">
                <label htmlFor="issue-status">{messages.issue.status}</label>
              </dt>
              <dd>
                <StatusSelect
                  id="issue-status"
                  value={issue.status}
                  issueType={issue.issueType}
                  onChange={(status) => changeStatus(status, confirmForceClose)}
                />
              </dd>
            </div>

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
          </dl>

          <div className="order-4 flex flex-col gap-6 border-t border-base-300 pt-7 @4xl:border-0 @4xl:pt-0">
            <section className="flex flex-col gap-2">
              <h3 className="caption">{messages.issue.labels}</h3>
              <LabelEditor
                labels={issue.labels}
                disabled={pending}
                onAdd={async (label) => (await run(() => addLabelAction(id, label))).ok}
                onRemove={(label) => void run(() => removeLabelAction(id, label))}
              />
            </section>

            <DependencyList
              title={messages.issueDetail.dependencies}
              side="dependencies"
              links={issue.dependencies}
              issueHref={issueHref}
              edit={{
                disabled: pending,
                onRemove: (link) => removeDependency(link, "dependencies"),
              }}
            />
            <DependencyList
              title={messages.issueDetail.dependents}
              side="dependents"
              links={issue.dependents}
              issueHref={issueHref}
              edit={{
                disabled: pending,
                onRemove: (link) => removeDependency(link, "dependents"),
              }}
            />
            <RelationAddForm issue={issue} writes={writes} />

            <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-base-300 pt-5 text-xs text-base-content/60 tabular-nums">
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
              onClick={() => void remove()}
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
