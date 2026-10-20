import type { IssueTextHit } from "@/shared/contract/issueList";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { IssueChip } from "./IssueChip";

/**
 * 본문 필드나 댓글에서 검색어가 맞은 곳마다 필드 이름과 검색어 주변의 발췌를 한 줄씩 보여 줍니다. 맞은 곳이 없으면 그리지 않습니다.
 * 발췌는 서버가 검색어 앞을 짧게 남겨 자르므로, 칸이 좁아 끝을 말줄임으로 줄여도 검색어가 보입니다.
 */
export function SearchHitLines({ hits }: { hits: readonly IssueTextHit[] | undefined }) {
  const messages = useMessages();
  if (!hits || hits.length === 0) return null;
  return (
    <span className="flex flex-col gap-0.5">
      {hits.map(({ field, excerpt }, index) => (
        <span
          key={index}
          className="flex min-w-0 items-center gap-1.5 text-xs text-base-content/60"
        >
          <IssueChip className="shrink-0">
            {field === "comment" ? messages.issues.commentHit : messages.issue.bodyFields[field]}
          </IssueChip>
          <span className="truncate">{excerpt}</span>
        </span>
      ))}
    </span>
  );
}
