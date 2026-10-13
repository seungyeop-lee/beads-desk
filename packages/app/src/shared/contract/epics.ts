import type { Issue } from "@beads-desk/bd/issue";

export const EPICS_PATH = "/api/epics";

export function epicChildrenPath(epicId: string): string {
  return `${EPICS_PATH}/${encodeURIComponent(epicId)}/children`;
}

export type EpicSummary = {
  epic: Issue;
  totalChildren: number;
  closedChildren: number;
  /** 하위 이슈가 모두 닫혀 epic을 닫을 수 있습니다. */
  eligibleForClose: boolean;
};
