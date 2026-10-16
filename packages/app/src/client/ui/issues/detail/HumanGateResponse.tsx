import type { IssueDetail } from "@beads-desk/bd/issue";
import { useId, useState } from "react";
import { useIssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { addCommentAction, approveHumanGateAction } from "@/server/web/issues/issueActions";
import { showToast } from "@/client/ui/designSystem/Toast";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HUMAN_DECISION_TONE } from "../issueLabels";
import { WriteErrorAlert } from "../WriteErrorAlert";
import { CommentList } from "./CommentList";

type Props = {
  gateId: string;
  /** gate의 상세 조회 결과입니다. 피드백 기록을 여기서 보입니다. */
  gate: IssueDetail | null;
  error: string | null;
};

/**
 * human gate에 피드백을 남기거나 승인합니다. 판단 기다림 화면과 막힌 작업 이슈의 상세가 함께 씁니다.
 * 피드백은 gate의 댓글이라 gate가 열린 채로 남고, 승인만 gate를 닫습니다. 막혀 있던 작업 이슈는 닫지 않습니다.
 */
export function HumanGateResponse({ gateId, gate, error }: Props) {
  const writes = useIssueWrites();
  const messages = useMessages();
  const approveHeadingId = useId();
  const [memo, setMemo] = useState("");

  const sendFeedback = async (text: string) => {
    const sent = (await writes.run(() => addCommentAction(gateId, text))).ok;
    if (sent) showToast(messages.humanGate.feedbackSent(gateId));
    return sent;
  };

  const approve = async () => {
    if ((await writes.run(() => approveHumanGateAction(gateId, memo))).ok) {
      showToast(messages.humanGate.approved(gateId));
    }
  };

  return (
    <>
      <WriteErrorAlert writes={writes} />

      <section
        className="flex flex-col gap-3 text-sm"
        aria-label={messages.humanGate.feedbackTitle}
      >
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold">{messages.humanGate.feedbackTitle}</h3>
          <p className="text-xs text-base-content/65">{messages.humanGate.feedbackBody}</p>
        </div>
        {error ? (
          <div role="alert" className="alert alert-error alert-soft">
            <span>{messages.issueDetail.loadFailed(error)}</span>
          </div>
        ) : gate ? (
          <CommentList
            comments={gate.comments}
            disabled={writes.pending}
            onAdd={sendFeedback}
            inputText={{
              label: messages.humanGate.feedback,
              placeholder: messages.humanGate.feedbackPlaceholder,
              submit: messages.humanGate.sendFeedback,
            }}
          />
        ) : (
          <span
            className="loading loading-spinner loading-sm text-base-content/40"
            aria-label={messages.issueDetail.loading}
          />
        )}
      </section>

      <form
        aria-labelledby={approveHeadingId}
        className={`tone-wash ${HUMAN_DECISION_TONE} flex flex-col gap-3 rounded-box px-4 py-3`}
        onSubmit={(event) => {
          event.preventDefault();
          void approve();
        }}
      >
        <div className="flex flex-col gap-1">
          <h3 id={approveHeadingId} className="flex items-center gap-2 text-sm font-semibold">
            <span className={`tone-dot ${HUMAN_DECISION_TONE}`} />
            {messages.humanGate.approveTitle}
          </h3>
          <p className="text-xs text-base-content/65">{messages.humanGate.approveBody}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="input input-sm grow bg-base-100"
            aria-label={messages.humanGate.memo}
            placeholder={messages.humanGate.memoPlaceholder}
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={writes.pending}>
            {messages.humanGate.approve}
          </button>
        </div>
      </form>
    </>
  );
}
