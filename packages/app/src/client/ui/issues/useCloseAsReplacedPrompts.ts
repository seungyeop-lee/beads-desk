import type { CloseAsReplacedPrompts } from "@/client/modules/issues/application/issueEdits";
import { showToast } from "@/client/ui/designSystem/Toast";
import { useMessages } from "@/client/ui/locale/LocaleProvider";

/** 중복 목록과 상세가 함께 쓰는 대체·중복으로 닫기의 확인과 안내입니다. */
export function useCloseAsReplacedPrompts(): CloseAsReplacedPrompts {
  const messages = useMessages();
  return {
    confirm: (replacement, issueId, targetId) =>
      window.confirm(messages.closeAsReplaced.confirm[replacement](issueId, targetId)),
    announce: (replacement, issueId, targetId) =>
      showToast(messages.closeAsReplaced.closed[replacement](issueId, targetId)),
  };
}
