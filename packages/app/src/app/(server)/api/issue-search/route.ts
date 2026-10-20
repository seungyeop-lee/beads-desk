import { handleIssueTextSearchRequest } from "@/server/web/issues/issueListRouteApi";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleIssueTextSearchRequest(request);
}
