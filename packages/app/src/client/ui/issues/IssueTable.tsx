import type { Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { memo } from "react";
import { issueEdits } from "@/client/modules/issues/application/issueEdits";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { copyIssueId } from "./copyIssueId";
import { confirmForceClose } from "./fields/confirmForceClose";
import { EditableText } from "./fields/EditableText";
import { PrioritySelect } from "./fields/PrioritySelect";
import { StatusSelect } from "./fields/StatusSelect";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { PencilIcon } from "@/client/ui/designSystem/icons";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { IssueTypeTag } from "./IssueTypeTag";

type Props = {
  issues: Issue[];
  issueHref: (issueId: string) => string;
  writes: IssueWrites;
  /** 없으면 필터에 맞는 이슈가 없다고 안내합니다. */
  emptyMessage?: string;
};

/** ID를 누르면 ID를 복사하고, 제목을 누르면 상세를 열고, 연필 버튼으로 제목을 고칩니다. 상태, 담당자, 우선순위는 표에서 바로 고칩니다. */
export const IssueTable = memo(function IssueTable({
  issues,
  issueHref,
  writes,
  emptyMessage,
}: Props) {
  const messages = useMessages();
  if (issues.length === 0) {
    return <EmptyState message={emptyMessage ?? messages.issueTable.empty} />;
  }
  return (
    <div className="surface overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th className="w-32">ID</th>
            <th className="w-28">{messages.issue.type}</th>
            <th>{messages.issue.title}</th>
            <th className="w-32">{messages.issue.status}</th>
            <th className="w-32">{messages.issue.priority}</th>
            <th className="w-40">{messages.issue.assignee}</th>
            <th className="w-20 text-right">{messages.issue.dependencyCount}</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} href={issueHref(issue.id)} writes={writes} />
          ))}
        </tbody>
      </table>
    </div>
  );
});

function IssueRow({ issue, href, writes }: { issue: Issue; href: string; writes: IssueWrites }) {
  const { update, changeStatus } = issueEdits(writes, issue.id);
  const messages = useMessages();
  return (
    <tr className="group hover:bg-base-200/60">
      <td>
        <button
          type="button"
          className="cursor-copy rounded font-mono text-xs text-base-content/55 hover:text-base-content"
          title={messages.issueTable.copyId}
          aria-label={messages.issueTable.copyIdOf(issue.id)}
          onClick={() => void copyIssueId(issue.id)}
        >
          {issue.id}
        </button>
      </td>
      <td className="text-sm">
        <IssueTypeTag issueType={issue.issueType} />
      </td>
      <td>
        <EditableText
          label={messages.issueTable.titleOf(issue.id)}
          value={issue.title}
          placeholder={messages.common.titlePlaceholder}
          required
          compact
          onSave={(title) => update({ title })}
          renderValue={(title, edit) => (
            <span className="flex items-center gap-1">
              <Link
                className="font-medium decoration-base-content/30 underline-offset-4 hover:underline"
                href={href}
                scroll={false}
              >
                {title || messages.common.untitled}
              </Link>
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-square text-base-content/50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label={messages.issueTable.editTitleOf(issue.id)}
                onClick={edit}
              >
                <PencilIcon width={13} height={13} />
              </button>
            </span>
          )}
        />
      </td>
      <td>
        <StatusSelect
          aria-label={messages.issueTable.statusOf(issue.id)}
          value={issue.status}
          issueType={issue.issueType}
          onChange={(status) => changeStatus(status, confirmForceClose)}
        />
      </td>
      <td>
        <PrioritySelect
          aria-label={messages.issueTable.priorityOf(issue.id)}
          value={issue.priority}
          onChange={(priority) => update({ priority })}
        />
      </td>
      <td className="text-sm">
        <EditableText
          label={messages.issueTable.assigneeOf(issue.id)}
          value={issue.assignee ?? ""}
          placeholder={messages.common.none}
          compact
          onSave={(assignee) => update({ assignee })}
        />
      </td>
      <td
        className={`text-right font-mono text-xs tabular-nums ${issue.dependencyCount + issue.dependentCount === 0 ? "text-base-content/30" : ""}`}
        title={messages.issueTable.dependencyCounts(issue.dependencyCount, issue.dependentCount)}
      >
        {issue.dependencyCount} / {issue.dependentCount}
      </td>
    </tr>
  );
}
