import type { Issue } from "@beads-desk/bd/issue";
import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import {
  HYGIENE_PATH,
  staleIssuesPath,
  type HygieneReport,
  type StaleDays,
} from "@/shared/contract/hygiene";

export function readHygiene(): Promise<ApiResponse<HygieneReport>> {
  return readApi(HYGIENE_PATH);
}

export function readStaleIssues(staleDays: StaleDays): Promise<ApiResponse<Issue[]>> {
  return readApi(staleIssuesPath(staleDays));
}
