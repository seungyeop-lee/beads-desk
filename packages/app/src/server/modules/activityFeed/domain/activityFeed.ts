import type {
  ActivityEntry,
  ActivityFeedPage,
  ActivityFeedQuery,
  ActivityKind,
} from "@/shared/contract/activityFeed";

/** 피드를 모으는 데 쓰는 이슈 내용입니다. `bd export` 레코드(ExportedIssue)가 이 모양을 채웁니다. 시각은 epoch ms입니다. */
export type FeedSourceIssue = {
  id: string;
  title: string;
  issueType: string;
  createdAt: number;
  /** 기록되지 않았으면 빈 문자열입니다. */
  createdBy: string;
  closedAt: number | null;
  closeReason: string | null;
  comments: readonly { id: string; author: string; text: string; createdAt: number }[];
};

/** 댓글과 닫은 사유는 줄 아래에 두 줄까지만 보이므로, 응답에는 앞에서부터 이만큼만 담습니다. */
const TEXT_LENGTH = 200;

/** 시각이 같은 기록은 한 이슈에서 일어나는 순서(만들기, 댓글, 닫기)의 역순으로 놓습니다. */
const KIND_ORDER: Record<ActivityKind, number> = { closed: 0, commented: 1, created: 2 };

/**
 * 이슈를 만들고 닫고 댓글을 단 기록을 모아, 조건에 맞는 기록을 새것부터 limit건까지 돌려줍니다.
 * gate는 그 레코드를 만들고 닫은 기록과 거기에 달린 댓글을 모두 뺍니다. gate는 사람의 판단을 받으려고 따로 만드는 레코드라,
 * 작업 이슈의 기록 사이에 섞이면 피드가 같은 판단 요청으로 채워집니다.
 */
export function activityFeedPage(
  issues: readonly FeedSourceIssue[],
  { since, until, limit }: ActivityFeedQuery,
): ActivityFeedPage {
  const start = since ?? -Infinity;
  const end = until ?? Infinity;
  const entries = issues
    .flatMap((issue) => (issue.issueType === "gate" ? [] : entriesOf(issue)))
    .filter((entry) => entry.at >= start && entry.at < end)
    .sort(newestFirst);
  return { entries: entries.slice(0, limit), hasMore: entries.length > limit };
}

function entriesOf(issue: FeedSourceIssue): ActivityEntry[] {
  const about = { issueId: issue.id, title: issue.title };
  const entries: ActivityEntry[] = [
    {
      key: `${issue.id}:created`,
      kind: "created",
      at: issue.createdAt,
      ...about,
      actor: issue.createdBy || null,
      text: null,
    },
  ];
  if (issue.closedAt !== null) {
    entries.push({
      key: `${issue.id}:closed`,
      kind: "closed",
      at: issue.closedAt,
      ...about,
      actor: null,
      text: excerpt(issue.closeReason ?? ""),
    });
  }
  issue.comments.forEach((comment, index) => {
    entries.push({
      key: `${issue.id}:comment:${comment.id || index}`,
      kind: "commented",
      at: comment.createdAt,
      ...about,
      actor: comment.author || null,
      text: excerpt(comment.text),
    });
  });
  return entries;
}

function newestFirst(a: ActivityEntry, b: ActivityEntry): number {
  return (
    b.at - a.at ||
    KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
    (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  );
}

/** 줄바꿈과 연속한 공백을 한 칸으로 줄이고 앞부분만 남깁니다. 내용이 없으면 null입니다. */
function excerpt(text: string): string | null {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat === "") return null;
  const chars = Array.from(flat);
  return chars.length > TEXT_LENGTH ? `${chars.slice(0, TEXT_LENGTH).join("")}…` : flat;
}
