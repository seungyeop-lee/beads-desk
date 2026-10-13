import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { DECISIONS_PATH, type DecisionSummary } from "@/shared/contract/decisions";

export function readDecisions(): Promise<ApiResponse<DecisionSummary[]>> {
  return readApi(DECISIONS_PATH);
}
