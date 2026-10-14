import type { IssueDetail } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useIssueDetail } from "@/client/modules/issues/application/useIssueDetail";
import { Markdown } from "@/client/ui/designSystem/Markdown";
import { CloseIcon } from "@/client/ui/designSystem/icons";
import { statusLabel, statusTone } from "../issueLabels";
import { IssueTypeTag } from "../IssueTypeTag";
import { DependencyList } from "./DependencyList";
import { BODY_FIELDS } from "./IssueDetailView";

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
  return (
    <section
      className="flex w-[34rem] max-w-[45%] shrink-0 flex-col border-l border-base-300 bg-base-200/30"
      aria-label={`${issueId} 이슈 옆 패널`}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-base-300 px-5 py-3">
        <span className="rounded-md bg-base-200 px-2 py-0.5 font-mono text-xs text-base-content/70">
          {issueId}
        </span>
        {data && (
          <span className="text-sm text-base-content/70">
            <IssueTypeTag issueType={data.issueType} />
          </span>
        )}
        {loading && (
          <span
            className="loading loading-spinner loading-xs text-base-content/40"
            aria-label="불러오는 중"
          />
        )}
        <Link className="btn btn-ghost btn-sm ml-auto font-medium" href={openHref} scroll={false}>
          이 이슈로 이동
        </Link>
        <Link
          className="btn btn-ghost btn-sm btn-square text-base-content/60"
          href={closeHref}
          scroll={false}
          aria-label="옆 패널 닫기"
        >
          <CloseIcon />
        </Link>
      </header>

      <div className="flex min-h-0 grow flex-col overflow-y-auto">
        {error && !data && (
          <div role="alert" className="alert alert-error alert-soft m-5">
            <span className="whitespace-pre-wrap">이슈를 불러오지 못했습니다: {error}</span>
          </div>
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
  return (
    <div className="flex flex-col gap-6 px-6 pt-5 pb-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-xl leading-snug font-bold tracking-tight">
          {issue.title || "(제목 없음)"}
        </h2>
        <span className={`chip self-start ${statusTone(issue.status)}`}>
          {statusLabel(issue.status)}
        </span>
      </div>
      {BODY_FIELDS.filter(([field]) => issue[field]).map(([field, label]) => (
        <section key={field} className="flex flex-col gap-2">
          <h3 className="caption">{label}</h3>
          <Markdown text={issue[field]} />
        </section>
      ))}
      {issue.dependencies.length > 0 && (
        <DependencyList
          title="이 이슈가 의존하는 이슈"
          side="dependencies"
          links={issue.dependencies}
          issueHref={sideHref}
        />
      )}
      {issue.dependents.length > 0 && (
        <DependencyList
          title="이 이슈에 의존하는 이슈"
          side="dependents"
          links={issue.dependents}
          issueHref={sideHref}
        />
      )}
    </div>
  );
}
