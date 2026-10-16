import { handleGraphRequest } from "@/server/web/graph/graphRouteApi";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return handleGraphRequest();
}
