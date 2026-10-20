/** 상세 본문에 차례로 보이는 markdown 필드입니다. 이슈 목록 검색도 이 필드에서 검색어를 찾습니다. */
export const BODY_FIELDS = ["description", "design", "acceptanceCriteria", "notes"] as const;

export type BodyField = (typeof BODY_FIELDS)[number];
