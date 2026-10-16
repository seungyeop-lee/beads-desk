import { awaitsHumanDecision, type IssueDetail } from "@beads-desk/bd/issue";
import { useId, useState } from "react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { dismissHumanAction, respondToHumanAction } from "@/server/web/issues/issueActions";
import { MarkdownEditor } from "@/client/ui/designSystem/MarkdownEditor";
import { showToast } from "@/client/ui/designSystem/Toast";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HUMAN_DECISION_TONE } from "../issueLabels";

type Props = {
  issue: IssueDetail;
  writes: IssueWrites;
};

/** 판단을 기다리는 이슈에서 응답하거나 넘깁니다. 둘 다 이슈를 닫습니다. */
export function HumanDecisionPanel({ issue, writes }: Props) {
  const messages = useMessages();
  const headingId = useId();
  const [response, setResponse] = useState("");
  // null이면 닫는 사유 입력란을 닫아 둔 상태입니다.
  const [dismissReason, setDismissReason] = useState<string | null>(null);
  if (!awaitsHumanDecision(issue)) return null;

  // Ctrl/Cmd+Enter는 비활성화된 버튼을 거치지 않으므로 여기서도 처리 중인지 확인합니다.
  const respond = async () => {
    if (writes.pending || !response.trim()) return;
    if ((await writes.run(() => respondToHumanAction(issue.id, response))).ok) {
      showToast(messages.humanDecision.responded(issue.id));
    }
  };

  const dismiss = async (reason: string) => {
    if ((await writes.run(() => dismissHumanAction(issue.id, reason))).ok) {
      showToast(messages.humanDecision.dismissed(issue.id));
    }
  };

  return (
    <section
      aria-labelledby={headingId}
      className={`tone-wash ${HUMAN_DECISION_TONE} flex flex-col gap-3 rounded-box px-4 py-3`}
    >
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="flex items-center gap-2 text-sm font-semibold">
          <span className={`tone-dot ${HUMAN_DECISION_TONE}`} />
          {messages.humanDecision.panelTitle}
        </h3>
        <p className="text-xs text-base-content/65">{messages.humanDecision.panelBody}</p>
      </div>
      {/*
       * 응답 없이 닫는 동안에는 적어 둔 응답이 bd에 넘어가지 않으므로 편집기를 감춥니다.
       * 편집기는 처음 값으로만 내용을 채우므로, 화면에서 빼지 않고 감추기만 해 취소하면 적어 둔 응답이 그대로 보이게 합니다.
       */}
      <div
        className={`textarea h-auto min-h-20 w-full bg-base-100 text-sm ${dismissReason === null ? "" : "hidden"}`}
      >
        <MarkdownEditor
          value=""
          label={messages.humanDecision.response}
          placeholder={messages.humanDecision.placeholder}
          onChange={setResponse}
          onSubmit={() => void respond()}
        />
      </div>
      {dismissReason === null ? (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={writes.pending}
            onClick={() => setDismissReason("")}
          >
            {messages.humanDecision.dismiss}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={writes.pending || !response.trim()}
            onClick={() => void respond()}
          >
            {messages.humanDecision.respond}
          </button>
        </div>
      ) : (
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void dismiss(dismissReason);
          }}
        >
          <input
            className="input input-sm grow"
            aria-label={messages.humanDecision.dismissReason}
            placeholder={messages.humanDecision.dismissReasonPlaceholder}
            value={dismissReason}
            onChange={(event) => setDismissReason(event.target.value)}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setDismissReason(null)}
          >
            {messages.common.cancel}
          </button>
          <button type="submit" className="btn btn-sm" disabled={writes.pending}>
            {messages.humanDecision.confirmDismiss}
          </button>
        </form>
      )}
    </section>
  );
}
