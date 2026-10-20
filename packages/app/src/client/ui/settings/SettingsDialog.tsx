import { useRef } from "react";
import { ModalBackdrop, useShowModal } from "@/client/ui/designSystem/modal";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { LocalePicker } from "@/client/ui/locale/LocalePicker";
import { ThemePicker } from "@/client/ui/theme/ThemePicker";
import { HumanDecisionNoticeToggle } from "./HumanDecisionNoticeToggle";

/** 화면 테마와 언어, 브라우저 알림을 고르는 대화상자입니다. 고르는 즉시 적용되므로 저장 단추가 없습니다. */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const messages = useMessages();

  useShowModal(dialogRef);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-label={messages.settings.title}
      onClose={onClose}
    >
      <div className="modal-box flex max-w-md flex-col gap-0 p-0">
        <div className="flex flex-col gap-5 px-7 pt-7 pb-6">
          <h2 className="text-xl font-bold tracking-tight">{messages.settings.title}</h2>
          <label className="flex flex-col gap-1.5">
            <span className="caption">{messages.settings.theme}</span>
            <ThemePicker />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="caption">{messages.settings.language}</span>
            <LocalePicker />
          </label>
          <HumanDecisionNoticeToggle />
        </div>
        <div className="flex items-center border-t border-base-300 bg-base-200/50 px-7 py-4">
          <button
            type="button"
            className="btn btn-primary ml-auto"
            onClick={() => dialogRef.current?.close()}
          >
            {messages.common.close}
          </button>
        </div>
      </div>
      <ModalBackdrop />
    </dialog>
  );
}
