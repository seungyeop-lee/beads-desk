import type { Issue } from "@beads-desk/bd/issue";

export const EPICS_PATH = "/api/epics";

export function epicChildrenPath(epicId: string): string {
  return `${EPICS_PATH}/${encodeURIComponent(epicId)}/children`;
}

export type EpicSummary = {
  epic: Issue;
  totalChildren: number;
  closedChildren: number;
};
