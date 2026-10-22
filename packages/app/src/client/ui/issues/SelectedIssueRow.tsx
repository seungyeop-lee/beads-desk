import type { Issue } from "@beads-desk/bd/issue";
import { CloseIcon } from "@/client/ui/designSystem/icons";
import { CopyIssueIdButton } from "./CopyIssueIdButton";
import { typeTone } from "./issueLabels";

type Props = {
  issue: Issue;
  variant: "parent" | "confirm";
  clear?: { label: string; disabled?: boolean; onClear: () => void };
};

export function SelectedIssueRow({ issue, variant, clear }: Props) {
  return (
    <span
      className={`flex items-center gap-2 rounded-field border border-base-300 px-3 text-sm ${variant === "parent" ? "h-10" : "h-8 min-w-0 grow bg-base-100"}`}
    >
      <span className={`tone-dot ${typeTone(issue.issueType)}`} />
      <CopyIssueIdButton
        issueId={issue.id}
        className={`rounded text-xs text-emphasis-60 ${variant === "confirm" ? "shrink-0" : ""}`}
      />
      <span className="min-w-0 grow truncate">{issue.title}</span>
      {clear && (
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square"
          aria-label={clear.label}
          disabled={clear.disabled}
          onClick={clear.onClear}
        >
          <CloseIcon width={13} height={13} />
        </button>
      )}
    </span>
  );
}
