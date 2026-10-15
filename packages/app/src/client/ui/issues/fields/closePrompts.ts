import { documentMessages } from "@/client/infra/locale/documentLocale";
import type { ClosePrompts } from "@/client/modules/issues/application/issueEdits";
import { showToast } from "@/client/ui/designSystem/Toast";
import { READY_TONE } from "../issueLabels";
import { askCloseReason } from "./CloseReasonDialog";

/** Toast에 이름을 보일 막힘이 풀린 이슈의 수입니다. 나머지는 개수로만 알립니다. */
const LISTED_UNBLOCKED = 3;

/** 표, 상세, 보드, 결정 화면에서 닫힘으로 바꿀 때 쓰는 확인과 안내입니다. */
export const closePrompts: ClosePrompts = {
  askReason: askCloseReason,
  confirmForce: (reason) =>
    window.confirm(documentMessages().issueDetail.confirmForceClose(reason)),
  announceUnblocked: (issues) => {
    const messages = documentMessages().closeIssue;
    const lines = issues.slice(0, LISTED_UNBLOCKED).map(({ id, title }) => `${id} ${title}`);
    if (issues.length > LISTED_UNBLOCKED) {
      lines.push(messages.andMore(issues.length - LISTED_UNBLOCKED));
    }
    showToast([messages.unblocked(issues.length), ...lines].join("\n"), { tone: READY_TONE });
  },
};
