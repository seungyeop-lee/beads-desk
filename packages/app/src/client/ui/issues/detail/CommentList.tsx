import type { IssueComment } from "@beads-desk/bd/issue";
import { useState, type ReactNode } from "react";
import { MarkdownEditor } from "@/client/ui/designSystem/MarkdownEditor";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { nameTone } from "../issueLabels";
import { formatTime } from "../issueTime";

type Props = {
  comments: IssueComment[];
  disabled: boolean;
  /** 성공하면 true를 돌려줍니다. */
  onAdd: (text: string) => Promise<boolean>;
};

/** 댓글 본문은 이슈 본문 필드처럼 markdown으로 보여 줍니다. Ctrl/Cmd+Enter로 남깁니다. 제목과 개수는 DiscussionTabs의 탭이 보입니다. */
export function CommentList({ comments, disabled, onAdd }: Props) {
  const [draft, setDraft] = useState("");
  // 남긴 뒤 입력란을 비우려면 편집기를 새로 만듭니다. 편집기는 처음 값만 받습니다.
  const [inputKey, setInputKey] = useState(0);
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
    <div className="flex flex-col gap-3">
      <CommentTimeline comments={comments} />
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
          <span className="text-xs text-base-content/40">{messages.comments.submitHint}</span>
          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={disabled || !draft.trim()}
          >
            {messages.comments.submit}
          </button>
        </div>
      </form>
    </div>
  );
}

/** 댓글을 받은 순서대로 입력란 없이 보입니다. */
export function CommentTimeline({ comments }: { comments: IssueComment[] }) {
  return comments.map((comment) => (
    <TimelineItem key={comment.id} author={comment.author} at={comment.createdAt}>
      <MarkdownEditor readOnly value={comment.text} />
    </TimelineItem>
  ));
}

/** 댓글과 활동 기록에서 한 사람이 남긴 항목 하나를 이름 머리글자, 이름, 시각과 함께 보입니다. */
export function TimelineItem({
  author,
  at,
  children,
}: {
  author: string;
  at: number;
  children: ReactNode;
}) {
  const locale = useLocale();
  return (
    <article className="flex gap-3 text-sm">
      <span
        className={`tone-fill grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${nameTone(author)}`}
        aria-hidden="true"
      >
        {author.slice(0, 1).toUpperCase()}
      </span>
      <div className="flex min-w-0 grow flex-col gap-1">
        <header className="flex items-baseline gap-2 text-xs">
          <span className="font-semibold">{author}</span>
          <time className="text-base-content/50" dateTime={new Date(at).toISOString()}>
            {formatTime(locale, at)}
          </time>
        </header>
        {children}
      </div>
    </article>
  );
}
