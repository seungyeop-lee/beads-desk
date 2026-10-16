import { humanGates } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type { HumanGateSummary } from "@/shared/contract/humanGates";

export async function handleHumanGatesRequest(): Promise<Response> {
  const result = await humanGates(currentWorkspaceRoot());
  return result.ok
    ? respond({ ok: true, data: result.value }, 200)
    : respond({ ok: false, error: result.error.message.trim() }, 500);
}

function respond(body: ApiResponse<HumanGateSummary[]>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
