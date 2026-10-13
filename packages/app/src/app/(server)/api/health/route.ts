import { handleHealthRequest } from "@/server/web/health/healthRouteApi";

export const dynamic = "force-dynamic";

export function GET(): Response {
  return handleHealthRequest();
}
