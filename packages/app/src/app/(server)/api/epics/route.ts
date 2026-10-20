import { handleEpicsRequest } from "@/server/web/epics/epicsRouteApi";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleEpicsRequest(request);
}
