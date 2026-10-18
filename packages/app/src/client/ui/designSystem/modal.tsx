import { useEffect, type RefObject } from "react";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/** dialog를 그린 뒤 열어야 하는 조건이 바뀔 때마다 확인해 열고, 이미 열려 있으면 다시 열지 않습니다. */
export function useShowModal(ref: RefObject<HTMLDialogElement | null>, enabled = true) {
  useEffect(() => {
    const dialog = ref.current;
    if (enabled && dialog && !dialog.open) dialog.showModal();
  }, [ref, enabled]);
}

/** 지금 초점이 글자 입력에 있으면 true입니다. Escape를 편집 취소로만 쓰고 dialog를 닫지 않을 때 씁니다. */
export function isTyping(): boolean {
  const active = document.activeElement;
  return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
}

/** dialog 바깥을 눌러 닫는 영역입니다. 닫기 문구는 보조 기술이 단추 이름으로 읽습니다. */
export function ModalBackdrop() {
  const messages = useMessages();
  return (
    <form method="dialog" className="modal-backdrop">
      <button type="submit">{messages.common.close}</button>
    </form>
  );
}
