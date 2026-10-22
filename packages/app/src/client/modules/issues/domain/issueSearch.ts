import type { Issue } from "@beads-desk/bd/issue";

/** 검색어를 비교에 쓰는 모양으로 다듬습니다. 검색어를 받는 화면은 모두 이 값으로 빈 검색어를 판단하고 찾습니다. */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** 소문자로 다듬은 검색어가 이슈의 id나 제목에 드는지 확인합니다. 빈 검색어일 때의 규칙은 호출부가 정합니다. */
export function matchesQuery(issue: Issue, search: string): boolean {
  return issue.id.toLowerCase().includes(search) || issue.title.toLowerCase().includes(search);
}
