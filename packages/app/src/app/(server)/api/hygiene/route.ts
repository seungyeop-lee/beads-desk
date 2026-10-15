import { handleHygieneRequest } from "@/server/web/hygiene/hygieneRouteApi";

export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return handleHygieneRequest();
}
