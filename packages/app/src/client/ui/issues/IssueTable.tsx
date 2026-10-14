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
import { IssueTypeTag } from "./IssueTypeTag";

type Props = {
  issues: Issue[];
  issueHref: (issueId: string) => string;
  writes: IssueWrites;
  emptyMessage?: string;
};

/** ID를 누르면 ID를 복사하고, 제목을 누르면 상세를 열고, 연필 버튼으로 제목을 고칩니다. 상태, 담당자, 우선순위는 표에서 바로 고칩니다. */
export const IssueTable = memo(function IssueTable({
  issues,
  issueHref,
  writes,
  emptyMessage = "조건에 맞는 이슈가 없습니다.",
}: Props) {
  if (issues.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }
  return (
    <div className="surface overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th className="w-32">ID</th>
            <th className="w-28">유형</th>
            <th>제목</th>
            <th className="w-32">상태</th>
            <th className="w-32">우선순위</th>
            <th className="w-40">담당자</th>
            <th className="w-20 text-right">의존</th>
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
  return (
    <tr className="group hover:bg-base-200/60">
      <td>
        <button
          type="button"
          className="cursor-copy rounded font-mono text-xs text-base-content/55 hover:text-base-content"
          title="ID 복사"
          aria-label={`${issue.id} ID 복사`}
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
          label={`${issue.id} 제목`}
          value={issue.title}
          placeholder="제목 없음"
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
                {title || "(제목 없음)"}
              </Link>
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-square text-base-content/50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label={`${issue.id} 제목 고치기`}
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
          aria-label={`${issue.id} 상태`}
          value={issue.status}
          onChange={(status) => changeStatus(status, confirmForceClose)}
        />
      </td>
      <td>
        <PrioritySelect
          aria-label={`${issue.id} 우선순위`}
          value={issue.priority}
          onChange={(priority) => update({ priority })}
        />
      </td>
      <td className="text-sm">
        <EditableText
          label={`${issue.id} 담당자`}
          value={issue.assignee ?? ""}
          placeholder="없음"
          compact
          onSave={(assignee) => update({ assignee })}
        />
      </td>
      <td
        className={`text-right font-mono text-xs tabular-nums ${issue.dependencyCount + issue.dependentCount === 0 ? "text-base-content/30" : ""}`}
        title={`이 이슈가 의존하는 이슈 ${issue.dependencyCount}개 · 이 이슈에 의존하는 이슈 ${issue.dependentCount}개`}
      >
        {issue.dependencyCount} / {issue.dependentCount}
      </td>
    </tr>
  );
}
