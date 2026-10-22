import type { IssueDetail } from "@beads-desk/bd/issue";
import { useId, useState } from "react";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { ActivityList } from "./ActivityList";
import { CommentList } from "./CommentList";

type Tab = "comments" | "activity";

type Props = {
  issue: IssueDetail;
  disabled: boolean;
  /** 성공하면 true를 돌려줍니다. */
  onAddComment: (text: string) => Promise<boolean>;
};

/** 댓글 탭과 활동 탭을 오갑니다. 활동 기록은 bd를 따로 실행해 읽으므로 활동 탭을 열 때만 읽습니다. */
export function DiscussionTabs({ issue, disabled, onAddComment }: Props) {
  const [tab, setTab] = useState<Tab>("comments");
  const id = useId();
  const messages = useMessages();
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "comments", label: messages.comments.title, count: issue.comments.length },
    { key: "activity", label: messages.activity.title },
  ];

  return (
    <section className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label={messages.activity.tabs}
        className="tabs tabs-border self-start"
      >
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`${id}-${key}-tab`}
            aria-selected={tab === key}
            aria-controls={`${id}-${key}`}
            className={`tab gap-1.5 px-2 text-xs font-semibold ${tab === key ? "tab-active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
            {count ? <span className="font-mono text-emphasis-50">{count}</span> : null}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-${tab}`} aria-labelledby={`${id}-${tab}-tab`}>
        {tab === "comments" ? (
          <CommentList comments={issue.comments} disabled={disabled} onAdd={onAddComment} />
        ) : (
          <ActivityList issue={issue} />
        )}
      </div>
    </section>
  );
}
