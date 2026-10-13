import type { Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { issueEdits } from "@/client/modules/issues/application/issueEdits";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { confirmForceClose } from "./fields/confirmForceClose";
import { EditableText } from "./fields/EditableText";
import { PrioritySelect } from "./fields/PrioritySelect";
import { StatusSelect } from "./fields/StatusSelect";
import { TYPE_LABELS } from "./issueLabels";

type Props = {
  issues: Issue[];
  issueHref: (issueId: string) => string;
  writes: IssueWrites;
};

/** 제목을 누르면 상세를 열고, 연필 버튼으로 제목을 고칩니다. 상태, 담당자, 우선순위는 표에서 바로 고칩니다. */
export function IssueTable({ issues, issueHref, writes }: Props) {
  if (issues.length === 0) {
    return <p className="py-10 text-center text-base-content/60">조건에 맞는 이슈가 없습니다.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
      <table className="table table-sm">
        <thead>
          <tr>
            <th className="w-36">ID</th>
            <th className="w-20">유형</th>
            <th>제목</th>
            <th className="w-32">상태</th>
            <th className="w-40">담당자</th>
            <th className="w-32">우선순위</th>
            <th className="w-20">의존</th>
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
}

function IssueRow({ issue, href, writes }: { issue: Issue; href: string; writes: IssueWrites }) {
  const { update, changeStatus } = issueEdits(writes, issue.id);
  return (
    <tr className="group hover:bg-base-200">
      <td className="font-mono text-xs">{issue.id}</td>
      <td>{TYPE_LABELS[issue.issueType] ?? issue.issueType}</td>
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
              <Link className="link link-hover" href={href} scroll={false}>
                {title || "(제목 없음)"}
              </Link>
              <button
                type="button"
                className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label={`${issue.id} 제목 고치기`}
                onClick={edit}
              >
                ✎
              </button>
            </span>
          )}
        />
      </td>
      <td>
        <StatusSelect
          aria-label={`${issue.id} 상태`}
          className="select-xs"
          value={issue.status}
          onChange={(status) => changeStatus(status, confirmForceClose)}
        />
      </td>
      <td>
        <EditableText
          label={`${issue.id} 담당자`}
          value={issue.assignee ?? ""}
          placeholder="없음"
          compact
          onSave={(assignee) => update({ assignee })}
        />
      </td>
      <td>
        <PrioritySelect
          aria-label={`${issue.id} 우선순위`}
          className="select-xs"
          value={issue.priority}
          onChange={(priority) => update({ priority })}
        />
      </td>
      <td
        className="tabular-nums"
        title={`이 이슈가 의존하는 이슈 ${issue.dependencyCount}개 · 이 이슈에 의존하는 이슈 ${issue.dependentCount}개`}
      >
        {issue.dependencyCount} / {issue.dependentCount}
      </td>
    </tr>
  );
}
