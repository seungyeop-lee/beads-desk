"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

type ReasonRequest = {
  id: number;
  issueId: string;
  /** 한 번만 효과가 있습니다. 확인하면 입력한 사유, 취소하면 null을 넘깁니다. */
  settle: (reason: string | null) => void;
};

let request: ReasonRequest | null = null;
let nextId = 0;
const listeners = new Set<() => void>();

function setRequest(next: ReasonRequest | null) {
  request = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * 닫는 사유를 묻는 dialog를 띄우고, 확인하면 입력한 사유를, 취소하면 null을 돌려줍니다.
 * 표, 상세, 보드, 결정 화면이 같은 dialog를 쓰도록 layout의 CloseReasonDialogHost가 그립니다.
 */
export function askCloseReason(issueId: string): Promise<string | null> {
  request?.settle(null);
  return new Promise((resolve) => {
    const current: ReasonRequest = {
      id: nextId++,
      issueId,
      settle: (reason) => {
        if (request !== current) return;
        setRequest(null);
        resolve(reason);
      },
    };
    setRequest(current);
  });
}

/** askCloseReason으로 연 dialog를 그립니다. layout에서 한 번만 렌더링합니다. */
export function CloseReasonDialogHost() {
  const current = useSyncExternalStore(
    subscribe,
    () => request,
    () => null,
  );
  return current && <CloseReasonDialog key={current.id} request={current} />;
}

function CloseReasonDialog({ request }: { request: ReasonRequest }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const messages = useMessages();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

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
          <span className="font-mono text-xs text-base-content/55">{request.issueId}</span>
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
      <form method="dialog" className="modal-backdrop">
        <button type="submit">{messages.common.close}</button>
      </form>
    </dialog>
  );
}
