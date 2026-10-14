import type { Issue } from "@beads-desk/bd/issue";

export const EPICS_PATH = "/api/epics";

/** epic의 직접 하위 이슈뿐 아니라 그 아래 이슈까지 모두 돌려주는 경로입니다. */
export function epicChildrenPath(epicId: string): string {
  return `${EPICS_PATH}/${encodeURIComponent(epicId)}/children`;
}

export type EpicSummary = {
  epic: Issue;
  totalChildren: number;
  closedChildren: number;
};
