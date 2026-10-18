import type { Issue } from "@beads-desk/bd/issue";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { IssueChip } from "./IssueChip";
import { statusTone } from "./issueLabels";
import { deferUntilLabel } from "./issueTime";

/** 보류한 이슈가 언제 다시 열리는지 한 줄로 보여 줍니다. 보류가 아니면 그리지 않습니다. */
export function DeferralLine({ issue }: { issue: Pick<Issue, "status" | "deferUntil"> }) {
  const messages = useMessages();
  const locale = useLocale();
  if (issue.status !== "deferred") return null;
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs text-base-content/60">
      <IssueChip tone={statusTone("deferred")}>{messages.deferral.until}</IssueChip>
      <span className="truncate tabular-nums">
        {deferUntilLabel(messages, locale, issue.deferUntil)}
      </span>
    </span>
  );
}
