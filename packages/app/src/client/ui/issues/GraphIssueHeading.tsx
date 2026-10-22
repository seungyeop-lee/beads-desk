import type { Issue } from "@beads-desk/bd/issue";
import { workState } from "@/client/modules/issues/domain/workState";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { CoveredIssueIdButton } from "./CoveredIssueRow";
import { IssueTypeTag } from "./IssueTypeTag";
import { workStateTone } from "./issueLabels";

export function GraphIssueHeading({
  issue,
  variant = "list",
}: {
  issue: Issue;
  variant?: "node" | "list";
}) {
  const messages = useMessages();
  const state = workState(issue);
  return (
    <span className="flex items-center gap-1.5 text-emphasis-60">
      <IssueTypeTag issueType={issue.issueType} />
      <span aria-hidden>·</span>
      <span className={`tone-dot ${workStateTone(state)}`} />
      <span className="min-w-0 truncate">{messages.workStates.labels[state]}</span>
      <CoveredIssueIdButton
        issueId={issue.id}
        short
        className={`ml-auto shrink-0 rounded ${variant === "node" ? "nodrag" : ""}`}
      />
    </span>
  );
}
