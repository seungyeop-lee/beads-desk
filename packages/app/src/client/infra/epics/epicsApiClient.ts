import type { Issue } from "@beads-desk/bd/issue";
import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { epicDescendantsPath, EPICS_PATH, type EpicSummary } from "@/shared/contract/epics";

export function readEpics(): Promise<ApiResponse<EpicSummary[]>> {
  return readApi(EPICS_PATH);
}

export function readEpicDescendants(epicId: string): Promise<ApiResponse<Issue[]>> {
  return readApi(epicDescendantsPath(epicId));
}
