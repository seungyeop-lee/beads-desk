import { dependencyGraph } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type { GraphData } from "@/shared/contract/graph";

/**
 * 닫힌 이슈까지 돌려주고, 표시 범위는 각 그래프 보기에서 고릅니다.
 * 에픽 보기는 닫힌 후손을, 이슈 중심 보기는 닫힌 선행·후속 이슈도 유지합니다.
 */
export async function handleGraphRequest(): Promise<Response> {
  const result = await dependencyGraph(currentWorkspaceRoot());
  return result.ok
    ? respond({ ok: true, data: result.value }, 200)
    : respond({ ok: false, error: result.error.message.trim() }, 500);
}

function respond(body: ApiResponse<GraphData>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
