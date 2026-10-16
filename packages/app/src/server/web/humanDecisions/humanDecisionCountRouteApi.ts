import { humanDecisionIssues } from "@beads-desk/bd";
import { awaitingHuman } from "@beads-desk/bd/issue";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";

/** 어느 화면에서나 보이는 상단 탭이 쓰므로, 전체 목록 대신 개수에 필요한 이슈만 읽어 센 수를 돌려줍니다. */
export async function handleHumanDecisionCountRequest(): Promise<Response> {
  const result = await humanDecisionIssues(currentWorkspaceRoot());
  return result.ok
    ? respond(
        { ok: true, data: awaitingHuman(result.value.gates, result.value.labeled).count },
        200,
      )
    : respond({ ok: false, error: result.error.message.trim() }, 500);
}

function respond(body: ApiResponse<number>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
