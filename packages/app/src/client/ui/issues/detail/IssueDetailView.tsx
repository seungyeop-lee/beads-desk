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
import { formatTime, TYPE_LABELS } from "../issueLabels";
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

const BODY_FIELDS = [
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
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <EditableText
          label="제목"
          value={issue.title}
          placeholder="제목 없음"
          required
          className="text-xl font-bold"
          onSave={(title) => update({ title })}
        />
        {BODY_FIELDS.map(([field, label]) => (
          <EditableMarkdown
            key={field}
            label={label}
            value={issue[field]}
            onSave={(value) => update({ [field]: value })}
          />
        ))}
        <CommentList
          comments={issue.comments}
          disabled={pending}
          onAdd={async (text) => (await run(() => addCommentAction(id, text))).ok}
        />
      </div>

      <aside className="flex flex-col gap-4 text-sm">
        <dl className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-3">
          <dt className="text-base-content/60">유형</dt>
          <dd>{TYPE_LABELS[issue.issueType] ?? issue.issueType}</dd>

          <dt className="text-base-content/60">
            <label htmlFor="issue-status">상태</label>
          </dt>
          <dd>
            <StatusSelect
              id="issue-status"
              className="select-sm"
              value={issue.status}
              onChange={(status) => changeStatus(status, confirmForceClose)}
            />
          </dd>

          {issue.closeReason && (
            <>
              <dt className="text-base-content/60">닫은 이유</dt>
              <dd className="break-words">{issue.closeReason}</dd>
            </>
          )}

          <dt className="text-base-content/60">
            <label htmlFor="issue-priority">우선순위</label>
          </dt>
          <dd>
            <PrioritySelect
              id="issue-priority"
              className="select-sm"
              value={issue.priority}
              onChange={(priority) => update({ priority })}
            />
          </dd>

          <dt className="text-base-content/60">담당자</dt>
          <dd className="min-w-0">
            <EditableText
              label="담당자"
              value={issue.assignee ?? ""}
              placeholder="없음"
              onSave={(assignee) => update({ assignee })}
            />
          </dd>

          <dt className="text-base-content/60">만든 시각</dt>
          <dd>{formatTime(issue.createdAt)}</dd>
          <dt className="text-base-content/60">고친 시각</dt>
          <dd>{formatTime(issue.updatedAt)}</dd>
          {issue.closedAt !== null && (
            <>
              <dt className="text-base-content/60">닫은 시각</dt>
              <dd>{formatTime(issue.closedAt)}</dd>
            </>
          )}
        </dl>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">라벨</h3>
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
          disabled={pending}
          issueHref={issueHref}
          onAdd={async (target) => (await run(() => addDependencyAction(id, target))).ok}
          onRemove={(link) => removeDependency(link, "dependencies")}
        />
        <DependencyList
          title="이 이슈에 의존하는 이슈"
          side="dependents"
          links={issue.dependents}
          disabled={pending}
          issueHref={issueHref}
          onAdd={async (source) => (await run(() => addDependencyAction(source, id))).ok}
          onRemove={(link) => removeDependency(link, "dependents")}
        />

        <button
          type="button"
          className="btn btn-outline btn-error btn-sm mt-2 self-start"
          disabled={pending}
          onClick={() => void remove()}
        >
          이슈 삭제
        </button>
      </aside>
    </div>
  );
}
