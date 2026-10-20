import { handleIssueDetailRequest } from "@/server/web/issues/issueDetailRouteApi";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext<"/api/issues/[id]">) {
  const { id } = await context.params;
  return handleIssueDetailRequest(request, id);
}
