import type { Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { memo, useMemo } from "react";
import { issueEdits } from "@/client/modules/issues/application/issueEdits";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { BlockerLine } from "./BlockerLine";
import { copyIssueId } from "./copyIssueId";
import { confirmForceClose } from "./fields/confirmForceClose";
import { EditableText } from "./fields/EditableText";
import { PrioritySelect } from "./fields/PrioritySelect";
import { StatusSelect } from "./fields/StatusSelect";
import { EmptyState } from "@/client/ui/designSystem/EmptyState";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { IssueTypeTag } from "./IssueTypeTag";

type Props = {
  issues: Issue[];
  issueHref: (issueId: string) => string;
  writes: IssueWrites;
  /** 없으면 필터에 맞는 이슈가 없다고 안내합니다. */
  emptyMessage?: string;
  /** 막고 있는 이슈의 제목을 찾을 목록입니다. 없으면 issues에서 찾습니다. */
  titleSource?: Issue[];
  /** 묶음마다 표를 나눠 보일 때, 첫 표가 아니면 열 이름을 감춥니다. 열 너비는 그대로 맞춥니다. */
  hideHeader?: boolean;
};

/** ID를 누르면 ID를 복사하고, 제목을 누르면 상세를 열고, 연필 버튼으로 제목을 고칩니다. 상태, 담당자, 우선순위는 표에서 바로 고칩니다. */
export const IssueTable = memo(function IssueTable({
  issues,
  issueHref,
  writes,
  emptyMessage,
  titleSource = issues,
  hideHeader,
}: Props) {
  const messages = useMessages();
  const titles = useMemo(
    () => new Map(titleSource.map((issue) => [issue.id, issue.title])),
    [titleSource],
  );
  if (issues.length === 0) {
    return <EmptyState message={emptyMessage ?? messages.issueTable.empty} />;
  }
  return (
    <div className="surface overflow-x-auto">
      <table className="table table-fixed">
        <thead className={hideHeader ? "invisible [&_th]:py-0 [&_th]:leading-[0]" : undefined}>
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
            <IssueRow
              key={issue.id}
              issue={issue}
              issueHref={issueHref}
              titleOf={(id) => titles.get(id)}
              writes={writes}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});

type RowProps = {
  issue: Issue;
  issueHref: (issueId: string) => string;
  /** 막고 있는 이슈의 제목을 표에서 찾습니다. */
  titleOf: (issueId: string) => string | undefined;
  writes: IssueWrites;
};

function IssueRow({ issue, issueHref, titleOf, writes }: RowProps) {
  const { update, changeStatus } = issueEdits(writes, issue.id);
  const href = issueHref(issue.id);
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
        <Link
          className="font-medium decoration-base-content/30 underline-offset-4 hover:underline"
          href={href}
          scroll={false}
        >
          {issue.title || messages.common.untitled}
        </Link>
        {issue.blockedBy && (
          <BlockerLine blockedBy={issue.blockedBy} titleOf={titleOf} issueHref={issueHref} />
        )}
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
