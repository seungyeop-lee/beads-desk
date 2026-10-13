import type { Issue } from "@beads-desk/bd/issue";
import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { epicChildrenPath, EPICS_PATH, type EpicSummary } from "@/shared/contract/epics";

export function readEpics(): Promise<ApiResponse<EpicSummary[]>> {
  return readApi(EPICS_PATH);
}

export function readEpicChildren(epicId: string): Promise<ApiResponse<Issue[]>> {
  return readApi(epicChildrenPath(epicId));
}
