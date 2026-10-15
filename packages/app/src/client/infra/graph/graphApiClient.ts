import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { graphPath, type GraphData } from "@/shared/contract/graph";

export function readGraph(includeClosed: boolean): Promise<ApiResponse<GraphData>> {
  return readApi(graphPath(includeClosed));
}
