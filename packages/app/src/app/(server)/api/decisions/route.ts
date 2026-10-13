import { handleDecisionsRequest } from "@/server/web/decisions/decisionsRouteApi";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return handleDecisionsRequest();
}
