import { handleIssueHistoryRequest } from "@/server/web/issues/issueDetailRouteApi";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext<"/api/issues/[id]/history">) {
  const { id } = await context.params;
  return handleIssueHistoryRequest(request, id);
}
