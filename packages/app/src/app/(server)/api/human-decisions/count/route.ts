import { handleHumanDecisionCountRequest } from "@/server/web/humanDecisions/humanDecisionCountRouteApi";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleHumanDecisionCountRequest(request);
}
