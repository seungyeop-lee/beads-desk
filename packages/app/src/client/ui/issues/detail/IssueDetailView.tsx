import type { IssueDetail, IssueLink } from "@beads-desk/bd/issue";
import { issueEdits } from "@/client/modules/issues/application/issueEdits";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import {
  addCommentAction,
  addDependencyAction,
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
import { CommentList } from "./CommentList";
import { DependencyList } from "./DependencyList";
import { EditableMarkdown } from "./EditableMarkdown";
import { LabelEditor } from "./LabelEditor";

type Props = {
  issue: IssueDetail;
  writes: IssueWrites;
  issueHref: (issueId: string) => string;
  onDeleted: () => void;
};

/** 상세 본문에 차례로 보이는 markdown 필드와 그 이름입니다. */
export const BODY_FIELDS = [
  ["description", "설명"],
  ["design", "설계"],
  ["acceptanceCriteria", "수용 기준"],
  ["notes", "메모"],
] as const;

export function IssueDetailView({ issue, writes, issueHref, onDeleted }: Props) {
  const { id } = issue;
  const { run, pending } = writes;
  const { update, changeStatus } = issueEdits(writes, id);

  const removeDependency = (link: IssueLink, side: "dependencies" | "dependents") => {
    if (!window.confirm(`${link.id} 이슈와의 의존 관계를 지울까요?`)) return;
    void run(() =>
      side === "dependencies"
        ? removeDependencyAction(id, link.id)
        : removeDependencyAction(link.id, id),
    );
  };

  const remove = async () => {
    if (!window.confirm(`${id} 이슈를 삭제할까요? 되돌릴 수 없습니다.`)) return;
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
          <div className="order-1">
            <EditableText
              label="제목"
              value={issue.title}
              placeholder="제목 없음"
              required
              className="text-2xl leading-snug font-bold tracking-tight"
              onSave={(title) => update({ title })}
            />
          </div>
          <div className="order-3 flex flex-col gap-7">
            <div className="flex flex-wrap gap-x-2 gap-y-7">
              {BODY_FIELDS.map(([field, label]) => (
                <EditableMarkdown
                  key={field}
                  label={label}
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
                <label htmlFor="issue-status">상태</label>
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
                <dt className="caption shrink-0">닫은 이유</dt>
                <dd className="min-w-0 break-words">{issue.closeReason}</dd>
              </div>
            )}

            <div className="flex items-center gap-3 @4xl:contents">
              <dt className="caption">
                <label htmlFor="issue-priority">우선순위</label>
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
              <dt className="caption">담당자</dt>
              <dd className="min-w-0">
                <EditableText
                  label="담당자"
                  value={issue.assignee ?? ""}
                  placeholder="없음"
                  onSave={(assignee) => update({ assignee })}
                />
              </dd>
            </div>
          </dl>

          <div className="order-4 flex flex-col gap-6 border-t border-base-300 pt-7 @4xl:border-0 @4xl:pt-0">
            <section className="flex flex-col gap-2">
              <h3 className="caption">라벨</h3>
              <LabelEditor
                labels={issue.labels}
                disabled={pending}
                onAdd={async (label) => (await run(() => addLabelAction(id, label))).ok}
                onRemove={(label) => void run(() => removeLabelAction(id, label))}
              />
            </section>

            <DependencyList
              title="이 이슈가 의존하는 이슈"
              side="dependencies"
              links={issue.dependencies}
              issueHref={issueHref}
              edit={{
                disabled: pending,
                onAdd: async (target) => (await run(() => addDependencyAction(id, target))).ok,
                onRemove: (link) => removeDependency(link, "dependencies"),
              }}
            />
            <DependencyList
              title="이 이슈에 의존하는 이슈"
              side="dependents"
              links={issue.dependents}
              issueHref={issueHref}
              edit={{
                disabled: pending,
                onAdd: async (source) => (await run(() => addDependencyAction(source, id))).ok,
                onRemove: (link) => removeDependency(link, "dependents"),
              }}
            />

            <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-base-300 pt-5 text-xs text-base-content/60 tabular-nums">
              <dt className="caption">만든 시각</dt>
              <dd>{formatTime(issue.createdAt)}</dd>
              <dt className="caption">고친 시각</dt>
              <dd>{formatTime(issue.updatedAt)}</dd>
              {issue.closedAt !== null && (
                <>
                  <dt className="caption">닫은 시각</dt>
                  <dd>{formatTime(issue.closedAt)}</dd>
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
              이슈 삭제
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
