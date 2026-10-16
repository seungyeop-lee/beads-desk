import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { GRAPH_PATH, type GraphData } from "@/shared/contract/graph";

export function readGraph(): Promise<ApiResponse<GraphData>> {
  return readApi(GRAPH_PATH);
}
