import { handleOpenGatesRequest } from "@/server/web/gates/gatesRouteApi";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return handleOpenGatesRequest();
}
