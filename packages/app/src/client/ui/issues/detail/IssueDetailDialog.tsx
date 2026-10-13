import type { IssueDetail } from "@beads-desk/bd/issue";
import { useEffect, useRef, useState } from "react";
import { useIssueDetail } from "@/client/modules/issues/application/useIssueDetail";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { CloseIcon } from "@/client/ui/designSystem/icons";
import { IssueTypeTag } from "../IssueTypeTag";
import { IssueDetailView } from "./IssueDetailView";
import { WriteErrorAlert } from "../WriteErrorAlert";

type Props = {
  issueId: string;
  issueHref: (issueId: string) => string;
  onClose: () => void;
};

/**
 * 내용을 받은 뒤에 dialog를 열어, 빈 dialog가 내용을 받으면서 커지는 모습이 보이지 않게 합니다.
 * 열린 dialog에서 다른 이슈로 옮기면 새 이슈를 받을 때까지 이전 이슈를 그대로 보여 줍니다.
 */
export function IssueDetailDialog({ issueId, issueHref, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data, error, loading } = useIssueDetail(issueId);
  const [lastIssue, setLastIssue] = useState<IssueDetail | null>(null);
  if (data && data !== lastIssue) setLastIssue(data);
  const issue = data ?? (loading ? lastIssue : null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!loading && dialog && !dialog.open) dialog.showModal();
  }, [loading]);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-label={`${issueId} 이슈`}
      onClose={onClose}
      onCancel={(event) => {
        // 입력 중에 누른 Escape는 편집 취소로만 쓰고 dialog를 닫지 않습니다.
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
          event.preventDefault();
        }
      }}
    >
      {/* 보이는 이슈가 바뀌면 새로 그려, 이전 이슈의 쓰기 오류와 진행 표시와 스크롤 위치가 남지 않게 합니다. */}
      <IssueDetailPanel
        key={issue?.id ?? issueId}
        issueId={issue?.id ?? issueId}
        issue={issue}
        error={issue ? null : error}
        loading={loading}
        issueHref={issueHref}
        onDeleted={() => dialogRef.current?.close()}
      />
      <form method="dialog" className="modal-backdrop">
        <button type="submit">닫기</button>
      </form>
    </dialog>
  );
}

type PanelProps = {
  issueId: string;
  issue: IssueDetail | null;
  error: string | null;
  loading: boolean;
  issueHref: (issueId: string) => string;
  onDeleted: () => void;
};

function IssueDetailPanel({ issueId, issue, error, loading, issueHref, onDeleted }: PanelProps) {
  const writes = useIssueWrites();
  return (
    <div className="modal-box flex max-h-[90vh] w-11/12 max-w-6xl flex-col overflow-hidden p-0">
      <header className="flex shrink-0 items-center gap-3 border-b border-base-300 px-6 py-3">
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
            aria-label="처리 중"
          />
        )}
        <form method="dialog" className="ml-auto">
          <button
            type="submit"
            className="btn btn-ghost btn-sm btn-square text-base-content/60"
            aria-label="닫기"
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
                <span className="whitespace-pre-wrap">이슈를 불러오지 못했습니다: {error}</span>
              </div>
            )}
          </div>
        )}
        {issue && (
          <IssueDetailView
            issue={issue}
            writes={writes}
            issueHref={issueHref}
            onDeleted={onDeleted}
          />
        )}
      </div>
    </div>
  );
}
