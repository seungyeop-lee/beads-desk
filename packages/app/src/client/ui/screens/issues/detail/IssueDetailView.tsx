import {
  ISSUE_STATUSES,
  type IssueDetail,
  type IssueLink,
  type IssueStatus,
} from "@beads-desk/bd/issue";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import {
  addCommentAction,
  addDependencyAction,
  addLabelAction,
  deleteIssueAction,
  removeDependencyAction,
  removeLabelAction,
  setIssueStatusAction,
  updateIssueAction,
} from "@/server/web/issues/issueActions";
import type { IssueChanges } from "@/shared/contract/issueActions";
import { formatTime, PRIORITIES, priorityLabel, STATUS_LABELS, TYPE_LABELS } from "../issueLabels";
import { CommentList } from "./CommentList";
import { DependencyList } from "./DependencyList";
import { EditableMarkdown } from "./EditableMarkdown";
import { EditableText } from "./EditableText";
import { LabelEditor } from "./LabelEditor";
import { useSavedValue } from "./useSavedValue";

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
  const [status, showStatus, resetStatus] = useSavedValue(issue.status);
  const [priority, showPriority, resetPriority] = useSavedValue(issue.priority);

  const update = async (changes: IssueChanges) =>
    (await run(() => updateIssueAction(id, changes))).ok;

  const changeStatus = async (next: IssueStatus) => {
    showStatus(next);
    let result = await run(() => setIssueStatusAction(id, next, false));
    if (!result.ok && "closeBlocked" in result) {
      writes.dismissError();
      const reason = result.error.split("\n")[0];
      const question = `열린 하위 이슈나 닫히지 않은 선행 이슈가 있어 bd가 닫기를 거부했습니다.\n\n${reason}\n\n그래도 닫을까요?`;
      if (window.confirm(question)) {
        result = await run(() => setIssueStatusAction(id, next, true));
      }
    }
    if (!result.ok) resetStatus();
  };

  const changePriority = async (next: number) => {
    showPriority(next);
    if (!(await update({ priority: next }))) resetPriority();
  };

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
            <select
              id="issue-status"
              className="select select-sm"
              value={status}
              onChange={(event) => void changeStatus(event.target.value as IssueStatus)}
            >
              {!(ISSUE_STATUSES as readonly string[]).includes(status) && (
                <option value={status}>{status}</option>
              )}
              {ISSUE_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {STATUS_LABELS[option]}
                </option>
              ))}
            </select>
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
            <select
              id="issue-priority"
              className="select select-sm"
              value={priority ?? ""}
              onChange={(event) => void changePriority(Number(event.target.value))}
            >
              {priority === null && <option value="">없음</option>}
              {PRIORITIES.map((option) => (
                <option key={option} value={option}>
                  P{option} {priorityLabel(option)}
                </option>
              ))}
            </select>
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
