import { type Issue, isOpenHumanGateLink } from "@beads-desk/bd/issue";
import Link from "next/link";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import { IssueChip } from "@/client/ui/issues/IssueChip";
import {
  HUMAN_DECISION_TONE,
  statusLabel,
  statusTone,
  typeLabel,
} from "@/client/ui/issues/issueLabels";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

export function IssueCardSection({
  label,
  issues,
  issueHref,
  centerId,
  waiting = 0,
  showType = false,
}: {
  label: string;
  issues: Issue[];
  issueHref: (issueId: string) => string;
  centerId?: string;
  waiting?: number;
  showType?: boolean;
}) {
  const messages = useMessages();
  return (
    <section
      aria-label={label}
      className="-mx-3 mt-1 border-t border-dashed border-base-300 px-1.5 pt-1.5"
    >
      <h3 className="flex items-center gap-1.5 px-1.5 pb-0.5 text-[11px] text-emphasis-60">
        {label}
        {waiting > 0 && (
          <>
            <span aria-hidden>·</span>
            <span className="text-lavender-line">
              {messages.humanDecision.chip} {waiting}
            </span>
          </>
        )}
      </h3>
      {issues.map((issue) => {
        const openHuman = isOpenHumanGateLink(issue);
        const status = statusLabel(messages, issue.status);
        const type = showType ? typeLabel(messages, issue.issueType) : undefined;
        return (
          <Link
            key={issue.id}
            href={issueHref(issue.id)}
            scroll={false}
            aria-label={`${issue.id} ${issue.title}`}
            aria-description={[type, status, openHuman && messages.humanDecision.chip]
              .filter(Boolean)
              .join(" · ")}
            aria-current={issue.id === centerId ? "true" : undefined}
            className={`relative flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 aria-[current=true]:ring-2 aria-[current=true]:ring-primary ${openHuman ? `${HUMAN_DECISION_TONE} tone-wash hover:bg-lavender-line/20` : "hover:bg-content-wash"}`}
          >
            <span
              className={`tone-dot ${openHuman ? HUMAN_DECISION_TONE : statusTone(issue.status)}`}
              data-tooltip={status}
            />
            {type && (
              <span className="shrink-0 rounded bg-content-wash px-1 text-[11px] text-emphasis-60">
                {type}
              </span>
            )}
            <span className="max-w-1/3 truncate font-mono text-[11px] text-emphasis-60">
              {shortIssueId(issue.id)}
            </span>
            <span
              className={`min-w-0 flex-1 truncate ${issue.status === "closed" ? "text-emphasis-50 line-through" : ""}`}
              data-tooltip={issue.title}
            >
              {issue.title}
            </span>
            {openHuman && (
              <IssueChip tone={HUMAN_DECISION_TONE}>{messages.humanDecision.chip}</IssueChip>
            )}
          </Link>
        );
      })}
    </section>
  );
}
