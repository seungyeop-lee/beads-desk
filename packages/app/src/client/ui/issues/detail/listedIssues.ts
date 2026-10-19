import type { Issue } from "@beads-desk/bd/issue";

/**
 * 상세 dialog 뒤 화면의 목록에 보이는 이슈를 id로 찾습니다.
 * dialog의 응답 패널은 이 목록에 있는 이슈면 상세가 아니라 목록의 상태로 보일지 정합니다.
 * 응답·닫기 알림은 패널이 사라질 때 뜨므로, 상세 조회가 목록 조회보다 먼저 끝나 닫힌 상태를 받아도 목록에서 행이 빠질 때까지 패널을 남겨 둡니다.
 */
export type ListedIssues = ReadonlyMap<string, Pick<Issue, "id" | "status" | "labels">>;
