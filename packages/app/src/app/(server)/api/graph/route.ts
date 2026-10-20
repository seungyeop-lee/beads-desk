import { handleGraphRequest } from "@/server/web/graph/graphRouteApi";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleGraphRequest(request);
}
