import { handleEpicDescendantsRequest } from "@/server/web/epics/epicsRouteApi";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext<"/api/epics/[id]/descendants">) {
  const { id } = await context.params;
  return handleEpicDescendantsRequest(id);
}
