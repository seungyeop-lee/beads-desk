import type { IssueDetail } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useIssueDetail } from "@/client/modules/issues/application/useIssueDetail";
import { linkedIssues } from "@/client/modules/issues/domain/issueRelations";
import { tabMarkdownUrl } from "@/client/modules/markdown/application/markdownAddress";
import { MarkdownEditor } from "@/client/ui/markdown/MarkdownEditor";
import { CloseIcon } from "@/client/ui/designSystem/icons";
import { ErrorAlert } from "@/client/ui/designSystem/ErrorAlert";
import { statusLabel, statusTone } from "../issueLabels";
import { IssueTypeTag } from "../IssueTypeTag";
import { DependencyList } from "./DependencyList";
import { BODY_FIELDS } from "@/shared/domain/issues/bodyFields";
import { CommentTimeline } from "./CommentList";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { CopyIssueIdButton } from "../CopyIssueIdButton";

type Props = {
  issueId: string;
  /** 이 패널을 닫은 주소입니다. */
  closeHref: string;
  /** 이 이슈를 주 상세로 여는 주소입니다. */
  openHref: string;
  /** 의존 이슈를 누르면 이 패널을 그 이슈로 바꾸는 주소입니다. */
  sideHref: (issueId: string) => string;
};

/** 주 상세와 나란히 다른 이슈를 읽기 전용으로 보여 주는 패널입니다. */
export function IssueSidePanel({ issueId, closeHref, openHref, sideHref }: Props) {
  const { data, error, loading } = useIssueDetail(issueId);
  const messages = useMessages();
  return (
    <section
      className="flex min-h-[32rem] min-w-0 w-full shrink-0 flex-col border-t border-base-300 bg-base-200/30 md:min-h-0 md:w-[34rem] md:max-w-[45%] md:border-t-0 md:border-l"
      aria-label={messages.issueDetail.sidePanel(issueId)}
    >
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-base-300 px-5 py-3">
        <CopyIssueIdButton
          issueId={issueId}
          className="shrink-0 rounded-md bg-base-200 px-2 py-0.5 text-xs text-base-content/70"
        />
        {data && (
          <span className="text-sm text-base-content/70">
            <IssueTypeTag issueType={data.issueType} />
          </span>
        )}
        {loading && (
          <span
            className="loading loading-spinner loading-xs text-base-content/40"
            aria-label={messages.common.loading}
          />
        )}
        <Link className="btn btn-ghost btn-sm ml-auto font-medium" href={openHref} scroll={false}>
          {messages.issueDetail.openInMain}
        </Link>
        <Link
          className="btn btn-ghost btn-sm btn-square text-base-content/60"
          href={closeHref}
          scroll={false}
          aria-label={messages.issueDetail.closeSidePanel}
        >
          <CloseIcon />
        </Link>
      </header>

      <div className="flex min-h-0 grow flex-col overflow-y-auto">
        {error && !data && (
          <ErrorAlert className="m-5" multiline>
            {messages.issueDetail.loadFailed(error)}
          </ErrorAlert>
        )}
        {data && <IssueSummary issue={data} sideHref={sideHref} />}
      </div>
    </section>
  );
}

function IssueSummary({
  issue,
  sideHref,
}: {
  issue: IssueDetail;
  sideHref: (issueId: string) => string;
}) {
  const messages = useMessages();
  const links = linkedIssues(issue);
  return (
    <div className="flex flex-col gap-6 px-6 pt-5 pb-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-xl leading-snug font-bold tracking-tight wrap-anywhere">
          {issue.title || messages.common.untitled}
        </h2>
        <span className={`chip self-start ${statusTone(issue.status)}`}>
          {statusLabel(messages, issue.status)}
        </span>
      </div>
      {BODY_FIELDS.filter((field) => issue[field]).map((field) => (
        <section key={field} className="flex flex-col gap-2">
          <h3 className="caption">{messages.issue.bodyFields[field]}</h3>
          <MarkdownEditor readOnly openAddress={tabMarkdownUrl} value={issue[field]} />
        </section>
      ))}
      {links.length > 0 && <DependencyList links={links} issueHref={sideHref} />}
      {issue.comments.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="caption">{messages.comments.title}</h3>
          <CommentTimeline comments={issue.comments} />
        </section>
      )}
    </div>
  );
}
