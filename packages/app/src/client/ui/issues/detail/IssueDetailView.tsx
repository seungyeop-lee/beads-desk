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

  return (
    <div className="grid grow md:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-7 px-8 pt-6 pb-10">
        <EditableText
          label="제목"
          value={issue.title}
          placeholder="제목 없음"
          required
          className="text-2xl leading-snug font-bold tracking-tight"
          onSave={(title) => update({ title })}
        />
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

      <aside className="flex flex-col gap-6 border-base-300 bg-base-200/50 px-6 pt-6 pb-8 text-sm md:border-l">
        <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3">
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

          {issue.closeReason && (
            <>
              <dt className="caption">닫은 이유</dt>
              <dd className="break-words">{issue.closeReason}</dd>
            </>
          )}

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

          <dt className="caption">담당자</dt>
          <dd className="min-w-0">
            <EditableText
              label="담당자"
              value={issue.assignee ?? ""}
              placeholder="없음"
              onSave={(assignee) => update({ assignee })}
            />
          </dd>
        </dl>

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
      </aside>
    </div>
  );
}
