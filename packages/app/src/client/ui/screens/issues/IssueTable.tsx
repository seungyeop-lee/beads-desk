import type { Issue, IssueStatus } from "@beads-desk/bd/issue";
import { priorityLabel, STATUS_BADGES, STATUS_LABELS, TYPE_LABELS } from "./issueLabels";

export function IssueTable({ issues }: { issues: Issue[] }) {
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
            <th className="w-24">상태</th>
            <th className="w-32">담당자</th>
            <th className="w-24">우선순위</th>
            <th className="w-20">의존</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const status = issue.status as IssueStatus;
  return (
    <tr className="hover:bg-base-200">
      <td className="font-mono text-xs">{issue.id}</td>
      <td>{TYPE_LABELS[issue.issueType] ?? issue.issueType}</td>
      <td>{issue.title}</td>
      <td>
        <span className={`badge badge-sm ${STATUS_BADGES[status] ?? "badge-ghost"}`}>
          {STATUS_LABELS[status] ?? issue.status}
        </span>
      </td>
      <td>{issue.assignee ?? ""}</td>
      <td>
        {issue.priority === null ? "" : `P${issue.priority} ${priorityLabel(issue.priority)}`}
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
