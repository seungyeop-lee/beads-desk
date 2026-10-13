import { useEffect, useRef } from "react";
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
              key={issue.id}
              issue={issue}
              writes={writes}
              issueHref={issueHref}
              onDeleted={() => dialogRef.current?.close()}
            />
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">닫기</button>
      </form>
    </dialog>
  );
}
