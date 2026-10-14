import type { IssueComment } from "@beads-desk/bd/issue";
import { useState } from "react";
import { MarkdownEditor } from "@/client/ui/designSystem/MarkdownEditor";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { formatTime, nameTone } from "../issueLabels";

type Props = {
  comments: IssueComment[];
  disabled: boolean;
  /** 성공하면 true를 돌려줍니다. */
  onAdd: (text: string) => Promise<boolean>;
};

/** 댓글 본문은 이슈 본문 필드처럼 markdown으로 보여 줍니다. Ctrl/Cmd+Enter로 남깁니다. */
export function CommentList({ comments, disabled, onAdd }: Props) {
  const [draft, setDraft] = useState("");
  // 남긴 뒤 입력란을 비우려면 편집기를 새로 만듭니다. 편집기는 처음 값만 받습니다.
  const [inputKey, setInputKey] = useState(0);
  const locale = useLocale();
  const messages = useMessages();
  // Ctrl/Cmd+Enter는 비활성화된 버튼을 거치지 않으므로 여기서도 처리 중인지 확인합니다.
  const submit = async () => {
    if (disabled || !draft.trim()) return;
    if (await onAdd(draft)) {
      setDraft("");
      setInputKey((key) => key + 1);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <h3 className="caption">
        {messages.comments.title}{" "}
        {comments.length > 0 && <span className="font-mono">{comments.length}</span>}
      </h3>
      {comments.map((comment) => (
        <article key={comment.id} className="flex gap-3 text-sm">
          <span
            className={`tone-fill grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${nameTone(comment.author)}`}
            aria-hidden="true"
          >
            {comment.author.slice(0, 1).toUpperCase()}
          </span>
          <div className="flex min-w-0 grow flex-col gap-1">
            <header className="flex items-baseline gap-2 text-xs">
              <span className="font-semibold">{comment.author}</span>
              <time
                className="text-base-content/50"
                dateTime={new Date(comment.createdAt).toISOString()}
              >
                {formatTime(locale, comment.createdAt)}
              </time>
            </header>
            <MarkdownEditor readOnly value={comment.text} />
          </div>
        </article>
      ))}
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="textarea h-auto min-h-20 w-full text-sm">
          <MarkdownEditor
            key={inputKey}
            value=""
            label={messages.comments.newComment}
            placeholder={messages.comments.placeholder}
            onChange={setDraft}
            onSubmit={() => void submit()}
          />
        </div>
        <div className="flex items-center justify-end gap-3">
          <span className="text-xs text-base-content/40">Ctrl/⌘ + Enter</span>
          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={disabled || !draft.trim()}
          >
            {messages.comments.submit}
          </button>
        </div>
      </form>
    </section>
  );
}
