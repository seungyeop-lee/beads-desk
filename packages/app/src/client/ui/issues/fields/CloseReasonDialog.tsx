"use client";

import { useRef, useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/client/ui/designSystem/ConfirmDialog";
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
  // 머리글의 ID 복사 단추보다 사유 입력이 먼저 focus를 받습니다.
  const reasonRef = useRef<HTMLInputElement>(null);
  const [reason, setReason] = useState("");
  const messages = useMessages();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    request.settle(reason);
  };

  return (
    <ConfirmDialog
      title={messages.closeIssue.title}
      confirmLabel={messages.closeIssue.submit}
      initialFocus={reasonRef}
      onCancel={() => request.settle(null)}
      onSubmit={submit}
      subtitle={
        <CopyIssueIdButton
          issueId={request.issueId}
          className="self-start rounded text-xs text-emphasis-60"
        />
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="caption">{messages.closeIssue.reason}</span>
        <input
          ref={reasonRef}
          className="input w-full"
          placeholder={messages.closeIssue.reasonPlaceholder}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
    </ConfirmDialog>
  );
}
