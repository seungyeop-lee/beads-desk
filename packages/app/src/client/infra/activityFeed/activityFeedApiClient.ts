import { readApi } from "@/client/infra/api/readApi";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type { ActivityFeedPage } from "@/shared/contract/activityFeed";

/** activityFeedPath로 만든 경로를 읽습니다. 경로를 조회 key로 써서, 조건이 같으면 다시 구독하지 않게 합니다. */
export function readActivityFeed(path: string): Promise<ApiResponse<ActivityFeedPage>> {
  return readApi(path);
}
