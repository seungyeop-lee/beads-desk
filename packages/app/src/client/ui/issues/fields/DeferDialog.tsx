"use client";

import { useRef, useState, type FormEvent } from "react";
import type { Deferral } from "@/client/modules/issues/application/issueEdits";
import { earliestDeferDay } from "@/client/modules/issues/domain/issueDeferral";
import { ModalBackdrop, useShowModal } from "@/client/ui/designSystem/modal";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { DEFER_PERIODS } from "@/shared/contract/issueActions";
import { createDialogRequest, type DialogRequest } from "./dialogRequest";
import { CopyIssueIdButton } from "../CopyIssueIdButton";

const deferralRequest = createDialogRequest<Deferral>();

/** 정해 둔 기한 뒤에 날짜 지정을 둡니다. */
const UNTIL_CHOICES = [...DEFER_PERIODS, "date"] as const;

type UntilChoice = (typeof UNTIL_CHOICES)[number];

/**
 * 보류 기한과 사유를 묻는 dialog를 띄우고, 확인하면 고른 값을, 취소하면 null을 돌려줍니다.
 * 표, 상세, 결정 화면이 같은 dialog를 쓰도록 layout의 DeferDialogHost가 그립니다.
 */
export const askDeferral = deferralRequest.ask;

/** askDeferral로 연 dialog를 그립니다. layout에서 한 번만 렌더링합니다. */
export function DeferDialogHost() {
  const current = deferralRequest.useCurrent();
  return current && <DeferDialog key={current.id} request={current} />;
}

function DeferDialog({ request }: { request: DialogRequest<Deferral> }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [choice, setChoice] = useState<UntilChoice>("tomorrow");
  const [earliestDay] = useState(() => earliestDeferDay(Date.now()));
  const [date, setDate] = useState(earliestDay);
  const [reason, setReason] = useState("");
  const messages = useMessages();

  useShowModal(dialogRef);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    request.settle({ until: choice === "date" ? { date } : choice, reason });
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-label={messages.deferral.title}
      onClose={() => request.settle(null)}
    >
      <form className="modal-box flex max-w-md flex-col gap-4" onSubmit={submit}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-tight">{messages.deferral.title}</h2>
          <CopyIssueIdButton
            issueId={request.issueId}
            className="self-start rounded text-xs text-base-content/55"
          />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="caption">{messages.deferral.until}</span>
          <select
            autoFocus
            className="select w-full"
            value={choice}
            onChange={(event) => setChoice(event.target.value as UntilChoice)}
          >
            {UNTIL_CHOICES.map((option) => (
              <option key={option} value={option}>
                {messages.deferral.periods[option]}
              </option>
            ))}
          </select>
        </label>
        {choice === "date" && (
          <label className="flex flex-col gap-1.5">
            <span className="caption">{messages.deferral.date}</span>
            <input
              type="date"
              required
              className="input w-full"
              min={earliestDay}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <span className="text-xs text-base-content/55">{messages.deferral.dateHint}</span>
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="caption">{messages.deferral.reason}</span>
          <input
            className="input w-full"
            placeholder={messages.deferral.reasonPlaceholder}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => request.settle(null)}>
            {messages.common.cancel}
          </button>
          <button type="submit" className="btn btn-primary">
            {messages.deferral.submit}
          </button>
        </div>
      </form>
      <ModalBackdrop />
    </dialog>
  );
}
