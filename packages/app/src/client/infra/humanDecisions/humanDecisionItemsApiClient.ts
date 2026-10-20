import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import {
  HUMAN_DECISION_ITEMS_PATH,
  type HumanDecisionItem,
} from "@/shared/contract/humanDecisions";

/** 이 탭이 보는 workspace가 아니어도 읽을 수 있도록 workspace를 직접 지정합니다. */
export function readHumanDecisionItems(
  workspace: string,
): Promise<ApiResponse<HumanDecisionItem[]>> {
  return readApi(HUMAN_DECISION_ITEMS_PATH, workspace);
}
