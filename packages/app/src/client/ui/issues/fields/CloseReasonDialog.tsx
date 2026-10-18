"use client";

import { useRef, useState, type FormEvent } from "react";
import { ModalBackdrop, useShowModal } from "@/client/ui/designSystem/modal";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { createDialogRequest, type DialogRequest } from "./dialogRequest";
import { CopyIssueIdButton } from "../CopyIssueIdButton";

const reasonRequest = createDialogRequest<string>();

/**
 * 닫는 사유를 묻는 dialog를 띄우고, 확인하면 입력한 사유를, 취소하면 null을 돌려줍니다.
 * 표, 상세, 보드, 결정 화면이 같은 dialog를 쓰도록 layout의 CloseReasonDialogHost가 그립니다.
 */
export const askCloseReason = reasonRequest.ask;

/** askCloseReason으로 연 dialog를 그립니다. layout에서 한 번만 렌더링합니다. */
export function CloseReasonDialogHost() {
  const current = reasonRequest.useCurrent();
  return current && <CloseReasonDialog key={current.id} request={current} />;
}

function CloseReasonDialog({ request }: { request: DialogRequest<string> }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const messages = useMessages();

  useShowModal(dialogRef);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    request.settle(reason);
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-label={messages.closeIssue.title}
      onClose={() => request.settle(null)}
    >
      <form className="modal-box flex max-w-md flex-col gap-4" onSubmit={submit}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-tight">{messages.closeIssue.title}</h2>
          <CopyIssueIdButton
            issueId={request.issueId}
            className="self-start rounded text-xs text-base-content/55"
          />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="caption">{messages.closeIssue.reason}</span>
          <input
            autoFocus
            className="input w-full"
            placeholder={messages.closeIssue.reasonPlaceholder}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => request.settle(null)}>
            {messages.common.cancel}
          </button>
          <button type="submit" className="btn btn-primary">
            {messages.closeIssue.submit}
          </button>
        </div>
      </form>
      <ModalBackdrop />
    </dialog>
  );
}
