import { decisionRecords } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type { DecisionSummary } from "@/shared/contract/decisions";

export async function handleDecisionsRequest(): Promise<Response> {
  const result = await decisionRecords(currentWorkspaceRoot());
  return result.ok
    ? respond({ ok: true, data: result.value }, 200)
    : respond({ ok: false, error: result.error.message.trim() }, 500);
}

function respond(body: ApiResponse<DecisionSummary[]>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
