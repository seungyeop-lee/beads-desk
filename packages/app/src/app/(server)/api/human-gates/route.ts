import { handleHumanGatesRequest } from "@/server/web/humanGates/humanGatesRouteApi";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleHumanGatesRequest(request);
}
