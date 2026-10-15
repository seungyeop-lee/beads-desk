/**
 * 표처럼 ID를 좁은 칸에 보일 때 workspace prefix를 뺀 부분을 돌려줍니다. `bd-desk-2lj.1.1`이면 `2lj.1.1`입니다.
 * prefix에도 `-`가 들어갈 수 있어서 마지막 `-` 뒤를 씁니다. bd가 만드는 hash에는 `-`가 없지만,
 * `bd create --id`로 직접 정한 ID는 prefix 뒤에도 `-`가 있을 수 있어 그 경우에는 마지막 조각만 보입니다.
 */
export function shortIssueId(issueId: string): string {
  return issueId.slice(issueId.lastIndexOf("-") + 1);
}
