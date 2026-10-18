import type { Issue } from "@beads-desk/bd/issue";

/** 소문자로 다듬은 검색어가 이슈의 id나 제목에 드는지 확인합니다. 빈 검색어일 때의 규칙은 호출부가 정합니다. */
export function matchesQuery(issue: Issue, search: string): boolean {
  return issue.id.toLowerCase().includes(search) || issue.title.toLowerCase().includes(search);
}
