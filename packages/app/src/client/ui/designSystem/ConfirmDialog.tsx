import { useRef, type FormEvent, type ReactNode, type RefObject } from "react";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { ModalBackdrop, useShowModal } from "./modal";

type Props = {
  title: string;
  subtitle?: ReactNode;
  confirmLabel: string;
  initialFocus: RefObject<HTMLElement | null>;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
};

export function ConfirmDialog({
  title,
  subtitle,
  confirmLabel,
  initialFocus,
  onCancel,
  onSubmit,
  children,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const messages = useMessages();
  useShowModal(dialogRef, true, initialFocus);
  return (
    <dialog ref={dialogRef} className="modal" aria-label={title} onClose={onCancel}>
      <form className="modal-box flex max-w-md flex-col gap-4" onSubmit={onSubmit}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          {subtitle}
        </div>
        {children}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {messages.common.cancel}
          </button>
          <button type="submit" className="btn btn-primary">
            {confirmLabel}
          </button>
        </div>
      </form>
      <ModalBackdrop />
    </dialog>
  );
}
