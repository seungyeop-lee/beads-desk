import type { Issue } from "@beads-desk/bd/issue";
import type { EpicStatus } from "@beads-desk/bd/types";

export const EPICS_PATH = "/api/epics";

export function epicDescendantsPath(epicId: string): string {
  return `${EPICS_PATH}/${encodeURIComponent(epicId)}/descendants`;
}

export type EpicSummary = EpicStatus;

export type EpicDescendants = {
  issues: Issue[];
  /**
   * issues의 이슈 id마다 대기 수를 담습니다. 대기 수가 0인 이슈는 담지 않습니다.
   * 에픽 밖에서 기다리는 이슈까지 세어야 이슈 목록과 같은 값이 나오므로, 서버가 후손을 고르기 전의 전체 이슈 목록으로 셉니다.
   */
  waiters: Record<string, number>;
};
