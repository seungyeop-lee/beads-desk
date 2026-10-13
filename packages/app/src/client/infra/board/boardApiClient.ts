import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { BOARD_PATH, type BoardItem } from "@/shared/contract/board";

export function readBoard(): Promise<ApiResponse<BoardItem[]>> {
  return readApi(BOARD_PATH);
}
