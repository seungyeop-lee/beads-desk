import { handleActivityFeedRequest } from "@/server/web/activityFeed/activityFeedRouteApi";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleActivityFeedRequest(request);
}
