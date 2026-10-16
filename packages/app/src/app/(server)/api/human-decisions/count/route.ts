import { handleHumanDecisionCountRequest } from "@/server/web/humanDecisions/humanDecisionCountRouteApi";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return handleHumanDecisionCountRequest();
}
