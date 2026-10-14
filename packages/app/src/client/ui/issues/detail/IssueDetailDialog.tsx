import type { IssueDetail } from "@beads-desk/bd/issue";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useIssueDetail } from "@/client/modules/issues/application/useIssueDetail";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import type { IssueDetailLocation } from "@/client/modules/issues/domain/issueDetailTrail";
import { ChevronLeftIcon, CloseIcon } from "@/client/ui/designSystem/icons";
import { IssueTypeTag } from "../IssueTypeTag";
import { IssueDetailView } from "./IssueDetailView";
import { IssueSidePanel } from "./IssueSidePanel";
import { WriteErrorAlert } from "../WriteErrorAlert";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

type Props = {
  location: IssueDetailLocation;
  /** 이 dialog에서 지금 주 상세로 넘어오기 전에 보던 상세입니다. 없으면 null입니다. */
  previous: IssueDetailLocation | null;
  detailHref: (location: IssueDetailLocation) => string;
  onClose: () => void;
};

/**
 * 내용을 받은 뒤에 dialog를 열어, 빈 dialog가 내용을 받으면서 커지는 모습이 보이지 않게 합니다.
 * 열기 전까지는 화면 맨 위의 막대와 마우스 커서로 불러오는 중임을 알립니다.
 * 열린 dialog에서 다른 이슈로 옮기면 새 이슈를 받을 때까지 이전 이슈를 그대로 보여 줍니다.
 * 주 상세에서 의존 이슈를 누르면 옆 패널에 그 이슈를 읽기 전용으로 엽니다.
 */
export function IssueDetailDialog({ location, previous, detailHref, onClose }: Props) {
  const { issue: issueId, side } = location;
  const sideHref = (sideId: string) => detailHref({ issue: issueId, side: sideId });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data, error, loading } = useIssueDetail(issueId);
  const [lastIssue, setLastIssue] = useState<IssueDetail | null>(null);
  if (data && data !== lastIssue) setLastIssue(data);
  const issue = data ?? (loading ? lastIssue : null);
  const opening = loading && lastIssue === null;
  const messages = useMessages();

  useEffect(() => {
    if (!opening) return;
    const root = document.documentElement;
    root.dataset.busy = "";
    return () => {
      delete root.dataset.busy;
    };
  }, [opening]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!loading && dialog && !dialog.open) dialog.showModal();
  }, [loading]);

  return (
    <>
      {opening && <output className="loading-bar" aria-label={messages.issueDetail.loading} />}
      <dialog
        ref={dialogRef}
        className="modal"
        aria-label={messages.issueDetail.dialog(issueId)}
        onClose={onClose}
        onCancel={(event) => {
          // 입력 중에 누른 Escape는 편집 취소로만 쓰고 dialog를 닫지 않습니다.
          const active = document.activeElement;
          if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
            event.preventDefault();
          }
        }}
      >
        <div
          className={`modal-box flex max-h-[90vh] w-11/12 overflow-hidden p-0 ${side ? "max-w-[110rem]" : "max-w-6xl"}`}
        >
          {/*
           * 보이는 이슈가 바뀌면 새로 그려, 이전 이슈의 쓰기 오류와 진행 표시와 스크롤 위치가 남지 않게 합니다.
           * 주 상세가 새 이슈를 받기 전에는 옆 패널과 같은 이슈를 보일 수 있어, 두 패널의 key에 접두어를 달리 붙입니다.
           */}
          <IssueDetailPanel
            key={`main:${issue?.id ?? issueId}`}
            issueId={issue?.id ?? issueId}
            issue={issue}
            error={issue ? null : error}
            loading={loading}
            previous={previous}
            detailHref={detailHref}
            sideHref={sideHref}
            onDeleted={() => dialogRef.current?.close()}
          />
          {side && (
            <IssueSidePanel
              key={`side:${side}`}
              issueId={side}
              closeHref={detailHref({ issue: issueId, side: null })}
              openHref={detailHref({ issue: side, side: null })}
              sideHref={sideHref}
            />
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit">{messages.common.close}</button>
        </form>
      </dialog>
    </>
  );
}

type PanelProps = {
  issueId: string;
  issue: IssueDetail | null;
  error: string | null;
  loading: boolean;
  previous: IssueDetailLocation | null;
  detailHref: (location: IssueDetailLocation) => string;
  /** 의존 이슈를 옆 패널에 여는 주소입니다. */
  sideHref: (issueId: string) => string;
  onDeleted: () => void;
};

function IssueDetailPanel({
  issueId,
  issue,
  error,
  loading,
  previous,
  detailHref,
  sideHref,
  onDeleted,
}: PanelProps) {
  const writes = useIssueWrites();
  const messages = useMessages();
  return (
    <div className="flex min-w-0 grow flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-base-300 px-6 py-3">
        {previous && (
          <Link
            className="btn btn-ghost btn-sm -ml-3 gap-1 px-2 font-mono text-xs font-normal text-base-content/60"
            href={detailHref(previous)}
            scroll={false}
            aria-label={messages.issueDetail.backTo(previous.issue)}
          >
            <ChevronLeftIcon width={14} height={14} />
            {previous.issue}
          </Link>
        )}
        <span className="rounded-md bg-base-200 px-2 py-0.5 font-mono text-xs text-base-content/70">
          {issueId}
        </span>
        {issue && (
          <span className="text-sm text-base-content/70">
            <IssueTypeTag issueType={issue.issueType} />
          </span>
        )}
        {(loading || writes.pending) && (
          <span
            className="loading loading-spinner loading-xs text-base-content/40"
            aria-label={messages.issueDetail.working}
          />
        )}
        <form method="dialog" className="ml-auto">
          <button
            type="submit"
            className="btn btn-ghost btn-sm btn-square text-base-content/60"
            aria-label={messages.common.close}
          >
            <CloseIcon />
          </button>
        </form>
      </header>

      <div className="flex min-h-0 grow flex-col overflow-y-auto">
        {(writes.error || error) && (
          <div className="flex flex-col gap-2 px-6 pt-4">
            <WriteErrorAlert writes={writes} />
            {error && (
              <div role="alert" className="alert alert-error alert-soft">
                <span className="whitespace-pre-wrap">
                  {messages.issueDetail.loadFailed(error)}
                </span>
              </div>
            )}
          </div>
        )}
        {issue && (
          <IssueDetailView
            issue={issue}
            writes={writes}
            issueHref={sideHref}
            onDeleted={onDeleted}
          />
        )}
      </div>
    </div>
  );
}
