import type { Issue } from "@beads-desk/bd/issue";
import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { OPEN_GATES_PATH } from "@/shared/contract/gates";

export function readOpenGates(): Promise<ApiResponse<Issue[]>> {
  return readApi(OPEN_GATES_PATH);
}
