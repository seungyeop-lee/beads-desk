import { handleDescriptionSearchRequest } from "@/server/web/issues/issueListRouteApi";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleDescriptionSearchRequest(request);
}
