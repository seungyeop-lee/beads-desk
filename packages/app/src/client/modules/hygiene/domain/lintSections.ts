/** bd lint가 알려 주는 빠진 섹션 제목(예: `## Acceptance Criteria`)에서 markdown 제목 기호와 공백을 지워 이름만 남깁니다. */
export function plainSectionTitle(title: string): string {
  return title.replace(/^#+\s*/, "");
}
