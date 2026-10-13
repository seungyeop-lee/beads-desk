import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { WORKSPACES_PATH, type WorkspaceList } from "@/shared/contract/workspaces";

export function readWorkspaces(): Promise<ApiResponse<WorkspaceList>> {
  return readApi(WORKSPACES_PATH);
}
