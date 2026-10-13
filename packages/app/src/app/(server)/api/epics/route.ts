import { handleEpicsRequest } from "@/server/web/epics/epicsRouteApi";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return handleEpicsRequest();
}
