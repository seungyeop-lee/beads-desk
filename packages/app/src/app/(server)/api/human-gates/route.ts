import { handleHumanGatesRequest } from "@/server/web/humanGates/humanGatesRouteApi";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return handleHumanGatesRequest();
}
