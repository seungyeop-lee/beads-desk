import { handleDecisionsRequest } from "@/server/web/decisions/decisionsRouteApi";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleDecisionsRequest(request);
}
