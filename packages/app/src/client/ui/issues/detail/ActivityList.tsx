import type { IssueDetail } from "@beads-desk/bd/issue";
import { useIssueHistory } from "@/client/modules/issues/application/useIssueHistory";
import { issueActivity } from "@/client/modules/issues/domain/issueActivity";
import { tabMarkdownUrl } from "@/client/modules/markdown/application/markdownAddress";
import { LoadResult } from "@/client/ui/designSystem/LoadResult";
import { MarkdownEditor } from "@/client/ui/markdown/MarkdownEditor";
import { useLocale, useMessages } from "@/client/ui/locale/LocaleProvider";
import { activityLineText } from "./activityText";
import { TimelineItem } from "./CommentList";

/** bd가 기록한 변경 이벤트와 댓글을 오래된 것부터 보입니다. 이 component가 화면에 있는 동안만 이벤트를 읽습니다. */
export function ActivityList({ issue }: { issue: Pick<IssueDetail, "id" | "comments"> }) {
  const { data: events, error } = useIssueHistory(issue.id);
  const locale = useLocale();
  const messages = useMessages();

  return (
    <LoadResult
      state={{ data: events, error }}
      loadFailed={(failed) => messages.activity.loadFailed(failed)}
      waiting={<p className="text-sm text-base-content/50">{messages.activity.loading}</p>}
    >
      {(events) => (
        <ol className="flex flex-col gap-3">
          {issueActivity(events, issue.comments).map((entry) => (
            <li key={entry.key}>
              {entry.kind === "comment" ? (
                <TimelineItem author={entry.comment.author} at={entry.at}>
                  <MarkdownEditor
                    readOnly
                    openAddress={tabMarkdownUrl}
                    value={entry.comment.text}
                  />
                </TimelineItem>
              ) : (
                <TimelineItem author={entry.actor} at={entry.at}>
                  <ul className="flex flex-col gap-0.5 break-words text-base-content/80">
                    {entry.lines.map((line, index) => (
                      <li key={index}>{activityLineText(messages, locale, line)}</li>
                    ))}
                  </ul>
                </TimelineItem>
              )}
            </li>
          ))}
        </ol>
      )}
    </LoadResult>
  );
}
