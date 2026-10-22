import { isOpenHumanGateLink, type IssueDetail } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useId } from "react";
import { openBlockers } from "@/client/modules/issues/domain/issueRelations";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HumanGateChip } from "../HumanGateChip";
import { StatusChip } from "../IssueChip";
import { CopyIssueIdButton } from "../CopyIssueIdButton";

type Props = {
  issue: IssueDetail;
  issueHref: (issueId: string) => string;
};

/**
 * 닫히지 않은 선행 이슈(blocks)가 있으면 상세 맨 위에 그 이슈들을 보여 줍니다. 닫힌 이슈에는 보이지 않습니다.
 * 열린 human gate는 상태 대신 사람 확인 기다림 표시를 붙입니다. 응답은 본문 아래의 HumanGatePanel에서 합니다.
 */
export function BlockerBanner({ issue, issueHref }: Props) {
  const messages = useMessages();
  const headingId = useId();
  const blockers = openBlockers(issue);
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
      <p className="text-xs text-emphasis-70">{messages.blocking.bannerBody}</p>
      <ul className="flex flex-col gap-1">
        {blockers.map((link) => (
          <li key={link.id} className="flex items-center gap-2 text-sm">
            <CopyIssueIdButton
              issueId={link.id}
              className="shrink-0 rounded text-xs text-emphasis-60"
            />
            <Link
              href={issueHref(link.id)}
              scroll={false}
              className="min-w-0 grow truncate hover:underline"
            >
              {link.title}
            </Link>
            {isOpenHumanGateLink(link) ? <HumanGateChip /> : <StatusChip status={link.status} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
