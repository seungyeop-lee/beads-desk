import { useEffect, type KeyboardEvent, type RefObject, type SyntheticEvent } from "react";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/**
 * dialog를 그린 뒤 열어야 하는 조건이 바뀔 때마다 확인해 열고, 이미 열려 있으면 다시 열지 않습니다.
 * 열면 브라우저가 dialog 안에서 처음 나오는 focus 가능한 요소에 focus를 둡니다. 다른 요소가 focus를 받아야 하면
 * initialFocus로 그 요소를 줍니다. React의 autoFocus는 dialog가 열리기 전에 실행되어 효과가 없습니다.
 */
export function useShowModal(
  ref: RefObject<HTMLDialogElement | null>,
  enabled = true,
  initialFocus?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const dialog = ref.current;
    if (!enabled || !dialog || dialog.open) return;
    dialog.showModal();
    initialFocus?.current?.focus();
  }, [ref, enabled, initialFocus]);
}

/** 지금 초점이 글자 입력에 있으면 true입니다. Escape를 편집 취소로만 쓰고 dialog를 닫지 않을 때 씁니다. */
function isTyping(): boolean {
  const active = document.activeElement;
  return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
}

/**
 * Escape 한 번에 dialog 안의 한 단계(옆 패널, 붙여 보는 상세)만 닫는 dialog의 onKeyDown·onCancel 처리기입니다.
 * 입력 중에 누른 Escape는 편집 취소로만 쓰고 아무것도 닫지 않습니다.
 * closeStep은 닫을 단계가 있으면 그 단계를 닫고 true를, 없으면 아무것도 하지 않고 false를 돌려줍니다. false이면 브라우저 기본 동작대로 dialog를 닫습니다.
 *
 * 브라우저는 사용자 활성화 없이 연달아 보낸 cancel을 취소할 수 없게 보내므로(HTML 표준의 close watcher 규칙),
 * 페이지를 누르지 않고 Escape를 연달아 누르면 cancel의 preventDefault로는 dialog가 닫히는 것을 막지 못합니다.
 * keydown을 막으면 cancel이 오지 않으므로 Escape는 keydown에서 처리하고, cancel은 초점이 dialog 밖에 있어 keydown이 dialog에 닿지 않을 때만 처리합니다.
 */
export function escapeStepHandlers(closeStep: () => boolean) {
  return {
    onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
      // 안쪽 입력이 이미 Escape를 쓴 경우와, portal로 그려 React tree로만 이 dialog에 이어진 다른 dialog에서 누른 Escape는 건너뜁니다.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (
        !(event.target instanceof Element) ||
        event.target.closest("dialog") !== event.currentTarget
      ) {
        return;
      }
      if (isTyping() || closeStep()) event.preventDefault();
    },
    onCancel(event: SyntheticEvent<HTMLDialogElement>) {
      if (isTyping() || closeStep()) event.preventDefault();
    },
  };
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
