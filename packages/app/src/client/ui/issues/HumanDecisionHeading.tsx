import type { Issue } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { CopyIssueIdButton } from "./CopyIssueIdButton";
import { IssueTypeTag } from "./IssueTypeTag";

export function HumanDecisionHeading({
  issue,
  href,
}: {
  issue: Pick<Issue, "id" | "title" | "issueType">;
  href: string;
}) {
  const messages = useMessages();
  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <IssueTypeTag issueType={issue.issueType} />
        <CopyIssueIdButton issueId={issue.id} className="rounded text-emphasis-60" />
        <Link href={href} scroll={false} className="ml-auto font-medium hover:underline">
          {messages.humanDecisions.openDetail} →
        </Link>
      </div>
      <h2 className="text-xl leading-snug font-bold">{issue.title || messages.common.untitled}</h2>
    </header>
  );
}
