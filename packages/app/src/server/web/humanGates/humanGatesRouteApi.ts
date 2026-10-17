import { humanGates, previousGateRounds } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";

export async function handleHumanGatesRequest(): Promise<Response> {
  return respond(await humanGates(currentWorkspaceRoot()));
}

/** 고른 gate와 같은 작업을 막았던 닫힌 gate(이전 라운드)의 기록을 읽습니다. */
export async function handlePreviousGateRoundsRequest(gateId: string): Promise<Response> {
  return respond(await previousGateRounds(currentWorkspaceRoot(), gateId));
}

function respond<T>(
  result: { ok: true; value: T } | { ok: false; error: { message: string } },
): Response {
  const body: ApiResponse<T> = result.ok
    ? { ok: true, data: result.value }
    : { ok: false, error: result.error.message.trim() };
  return Response.json(body, {
    status: result.ok ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
