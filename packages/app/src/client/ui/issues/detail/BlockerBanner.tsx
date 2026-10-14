import type { IssueDetail } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useId } from "react";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { statusLabel, statusTone } from "../issueLabels";

type Props = {
  issue: IssueDetail;
  issueHref: (issueId: string) => string;
};

/** 닫히지 않은 선행 이슈(blocks)가 있으면 상세 맨 위에 그 이슈들을 보여 줍니다. 닫힌 이슈에는 보이지 않습니다. */
export function BlockerBanner({ issue, issueHref }: Props) {
  const messages = useMessages();
  const headingId = useId();
  const blockers = issue.dependencies.filter(
    (link) => link.dependencyType === "blocks" && link.status !== "closed",
  );
  if (blockers.length === 0 || issue.status === "closed") return null;
  return (
    <section
      aria-labelledby={headingId}
      className="tone-wash tone-coral flex flex-col gap-2 rounded-box px-4 py-3"
    >
      <h3 id={headingId} className="flex items-center gap-2 text-sm font-semibold">
        <span className="tone-dot tone-coral" />
        {messages.blocking.bannerTitle}
      </h3>
      <p className="text-xs text-base-content/65">{messages.blocking.bannerBody}</p>
      <ul className="flex flex-col gap-1">
        {blockers.map((link) => (
          <li key={link.id} className="flex items-center gap-2 text-sm">
            <Link
              href={issueHref(link.id)}
              scroll={false}
              className="min-w-0 grow truncate hover:underline"
            >
              <span className="font-mono text-xs text-base-content/55">{link.id}</span> {link.title}
            </Link>
            <span className={`chip h-5 px-2 text-[11px] ${statusTone(link.status)}`}>
              {statusLabel(messages, link.status)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
