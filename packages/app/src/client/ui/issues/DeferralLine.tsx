import type { Issue } from "@beads-desk/bd/issue";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { deferUntilLabel, statusTone } from "./issueLabels";

/** 보류한 이슈가 언제 다시 열리는지 한 줄로 보여 줍니다. 보류가 아니면 그리지 않습니다. */
export function DeferralLine({ issue }: { issue: Pick<Issue, "status" | "deferUntil"> }) {
  const messages = useMessages();
  const locale = useLocale();
  if (issue.status !== "deferred") return null;
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs text-base-content/60">
      <span className={`chip ${statusTone("deferred")} h-5 px-2 text-[11px]`}>
        {messages.deferral.until}
      </span>
      <span className="truncate tabular-nums">
        {deferUntilLabel(messages, locale, issue.deferUntil)}
      </span>
    </span>
  );
}
