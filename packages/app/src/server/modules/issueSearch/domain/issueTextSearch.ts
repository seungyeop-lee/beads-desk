import type { IssueTextHit, IssueTextMatch } from "@/shared/contract/issueList";
import { BODY_FIELDS, type BodyField } from "@/shared/domain/issues/bodyFields";
import { searchTermPattern } from "@/shared/domain/issues/searchTerm";

/** 검색에 쓰는 이슈 내용입니다. `bd export` 레코드(ExportedIssue)가 이 모양을 채웁니다. */
export type SearchableIssue = Readonly<Record<BodyField, string>> & {
  id: string;
  issueType: string;
  comments: readonly { text: string }[];
};

/** 목록 행 아래에 보일 맞은 곳의 최대 개수입니다. 행이 너무 길어지지 않게 앞에서부터 이만큼만 담습니다. */
const MAX_HITS = 2;
/**
 * 발췌에서 검색어 앞에 남길 글자 수입니다. 목록 행은 발췌를 한 줄로 보이고 넘치는 끝을 말줄임으로 자르므로,
 * 제목 칸이 가장 좁을 때(약 15rem)에도 한글 발췌의 검색어가 잘리지 않도록 짧게 둡니다.
 */
const EXCERPT_BEFORE = 8;
/** 발췌의 최대 글자 수입니다. 잘라 낸 쪽에 붙이는 말줄임표는 세지 않습니다. */
const EXCERPT_LENGTH = 80;

/**
 * 상세 화면의 본문 필드와 댓글에서 text가 든(대소문자 무시) 이슈를 찾고, 이슈마다 맞은 곳과 발췌를 담습니다.
 * gate는 버립니다. gate의 설명과 댓글에는 리뷰 보고서 원문과 사용자 응답이 들어 있어, 그 내용으로는 이슈 목록에서 찾지 않습니다.
 */
export function searchIssueText(
  issues: readonly SearchableIssue[],
  text: string,
): IssueTextMatch[] {
  const pattern = searchTermPattern(text);
  return issues.flatMap((issue) => {
    if (issue.issueType === "gate") return [];
    const hits = hitsOf(issue, pattern);
    return hits.length > 0 ? [{ id: issue.id, hits }] : [];
  });
}

function hitsOf(issue: SearchableIssue, pattern: RegExp): IssueTextHit[] {
  const places = [
    ...BODY_FIELDS.map((field) => ({ field, text: issue[field] })),
    ...issue.comments.map((comment) => ({ field: "comment" as const, text: comment.text })),
  ];
  const hits: IssueTextHit[] = [];
  for (const { field, text } of places) {
    const excerpt = excerptAround(text, pattern);
    if (excerpt === null) continue;
    hits.push({ field, excerpt });
    if (hits.length === MAX_HITS) break;
  }
  return hits;
}

/** 처음 맞은 곳 주변을 잘라 줄바꿈과 연속 공백을 공백 하나로 줄입니다. 맞지 않으면 null입니다. 글자는 code point 단위로 셉니다. */
function excerptAround(text: string, pattern: RegExp): string | null {
  const match = pattern.exec(text);
  if (!match) return null;
  const before = Array.from(text.slice(0, match.index));
  const after = Array.from(text.slice(match.index));
  const head = before.slice(-EXCERPT_BEFORE);
  const tail = after.slice(0, EXCERPT_LENGTH - head.length);
  const excerpt = [...head, ...tail].join("").replace(/\s+/g, " ").trim();
  return `${head.length < before.length ? "…" : ""}${excerpt}${tail.length < after.length ? "…" : ""}`;
}
