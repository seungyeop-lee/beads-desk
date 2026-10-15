import { handleStaleIssuesRequest } from "@/server/web/hygiene/hygieneRouteApi";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleStaleIssuesRequest(request);
}
