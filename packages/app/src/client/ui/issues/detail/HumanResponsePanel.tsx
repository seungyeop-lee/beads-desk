import { useEffect, useId, useRef, useState } from "react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { dismissHumanAction, respondToHumanAction } from "@/server/web/issues/issueActions";
import { MarkdownEditor } from "@/client/ui/designSystem/MarkdownEditor";
import { showToast } from "@/client/ui/designSystem/Toast";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { HUMAN_DECISION_TONE } from "../issueLabels";

type Props = {
  issueId: string;
  writes: IssueWrites;
  title: string;
  body: string;
  placeholder: string;
};

/**
 * 사람의 판단을 기다리는 이슈에 bd human respond로 응답하거나 bd human dismiss로 응답 없이 닫습니다. 둘 다 이슈를 닫습니다.
 * human 라벨 질문과 human gate가 함께 씁니다.
 */
export function HumanResponsePanel({ issueId, writes, title, body, placeholder }: Props) {
  const messages = useMessages();
  const headingId = useId();
  const [response, setResponse] = useState("");
  // null이면 닫는 사유 입력란을 닫아 둔 상태입니다.
  const [dismissReason, setDismissReason] = useState<string | null>(null);
  const [closed, toastWhenRemoved] = useToastWhenRemoved();
  const locked = writes.pending || closed;

  // Ctrl/Cmd+Enter는 비활성화된 버튼을 거치지 않으므로 여기서도 버튼이 막혀 있는지 확인합니다.
  const respond = async () => {
    if (locked || !response.trim()) return;
    if ((await writes.run((workspace) => respondToHumanAction(workspace, issueId, response))).ok) {
      toastWhenRemoved(messages.humanDecision.responded(issueId));
    }
  };

  const dismiss = async (reason: string) => {
    if ((await writes.run((workspace) => dismissHumanAction(workspace, issueId, reason))).ok) {
      toastWhenRemoved(messages.humanDecision.dismissed(issueId));
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
          {title}
        </h3>
        <p className="text-xs text-base-content/65">{body}</p>
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
          placeholder={placeholder}
          onChange={setResponse}
          onSubmit={() => void respond()}
        />
      </div>
      {dismissReason === null ? (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={locked}
            onClick={() => setDismissReason("")}
          >
            {messages.humanDecision.dismiss}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={locked || !response.trim()}
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
          <button type="submit" className="btn btn-sm" disabled={locked}>
            {messages.humanDecision.confirmDismiss}
          </button>
        </form>
      )}
    </section>
  );
}

/**
 * 응답하거나 닫은 이슈는 화면이 서버 알림으로 다시 조회한 뒤에야 목록과 상세에서 빠지고, 그때 이 패널도 화면에서 사라집니다.
 * 쓰기가 끝나자마자 알리면 닫았다고 알린 이슈가 한동안 그대로 보이므로, 패널이 사라질 때 알립니다.
 * 패널이 사라질 때까지는 closed를 true로 돌려줘, 이미 닫은 이슈에 다시 응답하거나 닫지 못하도록 버튼을 막게 합니다.
 */
function useToastWhenRemoved(): [closed: boolean, toastWhenRemoved: (message: string) => void] {
  const [closed, setClosed] = useState(false);
  const mounted = useRef(false);
  const pendingMessage = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (pendingMessage.current !== null) showToast(pendingMessage.current);
    };
  }, []);

  const toastWhenRemoved = (message: string) => {
    // 쓰기를 기다리는 동안 다른 항목으로 옮겨 패널이 이미 사라졌으면 바로 알립니다.
    if (!mounted.current) {
      showToast(message);
      return;
    }
    pendingMessage.current = message;
    setClosed(true);
  };

  return [closed, toastWhenRemoved];
}
