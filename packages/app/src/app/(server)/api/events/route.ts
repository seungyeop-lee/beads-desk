import { handleWorkspaceEventsRequest } from "@/server/web/workspaceEvents/workspaceEventsRouteApi";

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  return handleWorkspaceEventsRequest(request);
}
