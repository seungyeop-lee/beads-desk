import { handleHumanDecisionItemsRequest } from "@/server/web/humanDecisions/humanDecisionItemsRouteApi";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleHumanDecisionItemsRequest(request);
}
