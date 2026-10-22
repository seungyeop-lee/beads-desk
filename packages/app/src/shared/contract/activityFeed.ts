import type { IssueFieldChange } from "@beads-desk/bd/issue";

const ACTIVITY_FEED_PATH = "/api/activity";

/**
 * 피드가 보이는 기록 종류입니다. 만들기, 닫기, 댓글은 `bd export`에서, 수정(updated)은 events journal에서 읽습니다.
 * 닫은 사람은 `bd export`에 없어 다루지 않습니다.
 */
export type ActivityKind = "created" | "closed" | "commented" | "updated";

/** 이슈 하나를 만들거나 닫거나 고치거나, 그 이슈에 댓글을 단 기록 한 건입니다. 시각은 epoch ms입니다. */
export type ActivityEntry = {
  /** 피드 안에서 기록 한 건을 가리키는 값입니다. */
  key: string;
  kind: ActivityKind;
  at: number;
  issueId: string;
  title: string;
  /**
   * 만든 기록은 `created_by`, 댓글은 `author`, 수정 기록은 journal의 `actor`를 bd가 남긴 그대로 담습니다.
   * bd가 닫은 사람은 export에 남기지 않아 닫은 기록은 null입니다.
   */
  actor: string | null;
  /** 닫은 기록의 `close_reason`이나 댓글 본문의 앞부분입니다. 없으면 null입니다. */
  text: string | null;
  /**
   * 수정 기록에서 바뀐 필드입니다. 다른 종류의 기록은 빈 배열입니다.
   * 수정 기록이어도 비교할 앞 journal 레코드가 없으면 빈 배열이고, 화면은 고쳤다는 사실만 보입니다.
   * 설명 같은 본문 필드는 고친 사실만 보이므로 before와 after를 null로 담습니다.
   */
  changes: IssueFieldChange[];
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
  /** workspace의 events journal이 켜져 있는지입니다. 꺼져 있으면 수정 기록이 없고, 화면은 켜는 방법을 안내합니다. */
  journalEnabled: boolean;
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
