import type { Issue } from "@beads-desk/bd/issue";
import type { ReactNode } from "react";
import { Spinner } from "@/client/ui/designSystem/Spinner";
import { CopyIssueIdButton } from "../CopyIssueIdButton";
import { IssueTypeTag } from "../IssueTypeTag";

type Props = {
  issueId: string;
  issueType: Issue["issueType"] | undefined;
  loading: boolean;
  loadingLabel: string;
  variant?: "main" | "side";
  leading?: ReactNode;
  children: ReactNode;
};

export function IssueDetailHeader({
  issueId,
  issueType,
  loading,
  loadingLabel,
  variant = "main",
  leading,
  children,
}: Props) {
  return (
    <header
      className={`flex shrink-0 flex-wrap items-center border-b border-base-300 py-3 ${variant === "main" ? "gap-3 px-6" : "gap-x-3 gap-y-2 px-5"}`}
    >
      {leading}
      <CopyIssueIdButton
        issueId={issueId}
        className="shrink-0 rounded-md bg-base-200 px-2 py-0.5 text-xs text-emphasis-70"
      />
      {issueType !== undefined && (
        <span className="text-sm text-emphasis-70">
          <IssueTypeTag issueType={issueType} />
        </span>
      )}
      {loading && <Spinner tone="muted" label={loadingLabel} />}
      {children}
    </header>
  );
}
