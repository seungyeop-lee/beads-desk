import { handlePreviousGateRoundsRequest } from "@/server/web/humanGates/humanGatesRouteApi";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/human-gates/[id]/previous-gates">,
) {
  const { id } = await context.params;
  return handlePreviousGateRoundsRequest(id);
}
