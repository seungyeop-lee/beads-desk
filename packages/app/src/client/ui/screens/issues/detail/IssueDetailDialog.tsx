import { useEffect, useRef } from "react";
import { useIssueDetail } from "@/client/modules/issues/application/useIssueDetail";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { IssueDetailView } from "./IssueDetailView";

type Props = {
  issueId: string;
  issueHref: (issueId: string) => string;
  onClose: () => void;
};

export function IssueDetailDialog({ issueId, issueHref, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data: issue, error, loading } = useIssueDetail(issueId);
  const writes = useIssueWrites();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

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
      <div className="modal-box flex max-h-[90vh] w-11/12 max-w-5xl flex-col gap-4">
        <header className="flex items-center gap-3">
          <span className="font-mono text-sm text-base-content/60">{issueId}</span>
          {(loading || writes.pending) && (
            <span className="loading loading-spinner loading-xs" aria-label="처리 중" />
          )}
          <form method="dialog" className="ml-auto">
            <button type="submit" className="btn btn-ghost btn-sm" aria-label="닫기">
              ✕
            </button>
          </form>
        </header>

        {writes.error && (
          <div role="alert" className="alert alert-error alert-soft">
            <span className="whitespace-pre-wrap">{writes.error}</span>
            <button type="button" className="btn btn-ghost btn-xs" onClick={writes.dismissError}>
              닫기
            </button>
          </div>
        )}
        {error && (
          <div role="alert" className="alert alert-error alert-soft">
            <span className="whitespace-pre-wrap">이슈를 불러오지 못했습니다: {error}</span>
          </div>
        )}
        {issue && (
          <IssueDetailView
            key={issue.id}
            issue={issue}
            writes={writes}
            issueHref={issueHref}
            onDeleted={() => dialogRef.current?.close()}
          />
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">닫기</button>
      </form>
    </dialog>
  );
}
