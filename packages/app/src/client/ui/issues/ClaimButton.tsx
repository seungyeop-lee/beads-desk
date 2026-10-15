import type { Issue } from "@beads-desk/bd/issue";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { canClaim } from "@/client/modules/issues/domain/issueClaim";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { claimIssueAction } from "@/server/web/issues/issueActions";

/** 가져갈 수 없는 이슈에는 그리지 않습니다. bd가 거부하면 그 사유가 writes.error에 남습니다. */
export function ClaimButton({
  issue,
  writes,
}: {
  issue: Pick<Issue, "id" | "status" | "issueType">;
  writes: Pick<IssueWrites, "pending" | "run">;
}) {
  const messages = useMessages();
  if (!canClaim(issue)) return null;
  return (
    <button
      type="button"
      className="btn btn-xs shrink-0"
      title={messages.claim.hint}
      disabled={writes.pending}
      onClick={() => void writes.run(() => claimIssueAction(issue.id))}
    >
      {messages.claim.label}
    </button>
  );
}
