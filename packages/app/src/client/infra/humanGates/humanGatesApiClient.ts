import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import {
  HUMAN_GATES_PATH,
  previousGateRoundsPath,
  type HumanGateSummary,
  type PreviousGateRound,
} from "@/shared/contract/humanGates";

export function readHumanGates(): Promise<ApiResponse<HumanGateSummary[]>> {
  return readApi(HUMAN_GATES_PATH);
}

export function readPreviousGateRounds(gateId: string): Promise<ApiResponse<PreviousGateRound[]>> {
  return readApi(previousGateRoundsPath(gateId));
}
