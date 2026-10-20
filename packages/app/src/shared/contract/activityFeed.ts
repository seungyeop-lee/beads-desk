const ACTIVITY_FEED_PATH = "/api/activity";

/** 피드가 보이는 기록 종류입니다. 닫은 사람과 필드 변경은 `bd export`에 없어 다루지 않습니다. */
export type ActivityKind = "created" | "closed" | "commented";

/** 이슈 하나를 만들거나 닫거나 그 이슈에 댓글을 단 기록 한 건입니다. 시각은 epoch ms입니다. */
export type ActivityEntry = {
  /** 피드 안에서 기록 한 건을 가리키는 값입니다. */
  key: string;
  kind: ActivityKind;
  at: number;
  issueId: string;
  title: string;
  /** 만든 기록은 `created_by`, 댓글은 `author`를 bd가 남긴 그대로 담습니다. bd가 닫은 사람은 export에 남기지 않아 닫은 기록은 null입니다. */
  actor: string | null;
  /** 닫은 기록의 `close_reason`이나 댓글 본문의 앞부분입니다. 없으면 null입니다. */
  text: string | null;
};

/**
 * 피드 조회 조건입니다. since 이상 until 미만인 기록을 새것부터 limit건까지 돌려줍니다.
 * since와 until이 null이면 그쪽 끝을 열어 둡니다. 하루의 경계는 브라우저 현지 시각이라 client가 시각으로 바꿔 보냅니다.
 */
export type ActivityFeedQuery = { since: number | null; until: number | null; limit: number };

export type ActivityFeedPage = {
  entries: ActivityEntry[];
  /** 조건에 맞는 기록이 limit건보다 많아 더 읽을 수 있는지입니다. */
  hasMore: boolean;
};

export function activityFeedPath({ since, until, limit }: ActivityFeedQuery): string {
  const params = new URLSearchParams({ limit: String(limit) });
  if (since !== null) params.set("since", String(since));
  if (until !== null) params.set("until", String(until));
  return `${ACTIVITY_FEED_PATH}?${params}`;
}

/** limit이 1 이상의 정수가 아니거나 since, until이 정수가 아니면 null을 돌려줍니다. */
export function parseActivityFeedQuery(params: URLSearchParams): ActivityFeedQuery | null {
  const limit = Number(params.get("limit"));
  const since = optionalInteger(params.get("since"));
  const until = optionalInteger(params.get("until"));
  if (!Number.isSafeInteger(limit) || limit < 1 || since === undefined || until === undefined) {
    return null;
  }
  return { since, until, limit };
}

/** 값이 없으면 null, 정수가 아니면 undefined입니다. */
function optionalInteger(value: string | null): number | null | undefined {
  if (value === null) return null;
  const parsed = Number(value);
  return value !== "" && Number.isSafeInteger(parsed) ? parsed : undefined;
}
