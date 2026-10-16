import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { HUMAN_DECISION_COUNT_PATH } from "@/shared/contract/humanDecisions";

export function readHumanDecisionCount(): Promise<ApiResponse<number>> {
  return readApi(HUMAN_DECISION_COUNT_PATH);
}
