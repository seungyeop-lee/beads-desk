import type { Issue } from "@beads-desk/bd/issue";

export const EPICS_PATH = "/api/epics";

export function epicDescendantsPath(epicId: string): string {
  return `${EPICS_PATH}/${encodeURIComponent(epicId)}/descendants`;
}

export type EpicSummary = {
  epic: Issue;
  totalChildren: number;
  closedChildren: number;
};
