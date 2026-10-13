import type { IssueComment } from "@beads-desk/bd/issue";
import { useState } from "react";
import { formatTime } from "../issueLabels";

type Props = {
  comments: IssueComment[];
  disabled: boolean;
  /** 성공하면 true를 돌려줍니다. */
  onAdd: (text: string) => Promise<boolean>;
};

/** 댓글은 bd가 보여 주는 대로 일반 글자로 보여 줍니다. Ctrl/Cmd+Enter로 남깁니다. */
export function CommentList({ comments, disabled, onAdd }: Props) {
  const [draft, setDraft] = useState("");
  // Ctrl/Cmd+Enter는 비활성화된 버튼을 거치지 않으므로 여기서도 처리 중인지 확인합니다.
  const submit = async () => {
    if (disabled || !draft.trim()) return;
    if (await onAdd(draft)) setDraft("");
  };

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold">댓글 {comments.length > 0 && comments.length}</h3>
      {comments.map((comment) => (
        <article key={comment.id} className="rounded-box bg-base-200 p-3 text-sm">
          <header className="mb-1 flex gap-2 text-xs text-base-content/60">
            <span className="font-semibold">{comment.author}</span>
            <time dateTime={new Date(comment.createdAt).toISOString()}>
              {formatTime(comment.createdAt)}
            </time>
          </header>
          <p className="whitespace-pre-wrap break-words">{comment.text}</p>
        </article>
      ))}
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <textarea
          className="textarea field-sizing-content min-h-20 w-full text-sm"
          aria-label="새 댓글"
          placeholder="댓글을 남기세요"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void submit();
            }
          }}
        />
        <button type="submit" className="btn btn-sm self-end" disabled={disabled || !draft.trim()}>
          댓글 남기기
        </button>
      </form>
    </section>
  );
}
