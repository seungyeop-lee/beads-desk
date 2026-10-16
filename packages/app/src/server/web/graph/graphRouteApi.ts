import { dependencyGraph } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type { GraphData } from "@/shared/contract/graph";

/** 에픽 보기가 닫힌 후손 이슈도 그리도록 닫힌 이슈까지 돌려줍니다. 이슈 중심 보기는 받은 뒤 닫힌 이슈를 뺍니다. */
export async function handleGraphRequest(): Promise<Response> {
  const result = await dependencyGraph(currentWorkspaceRoot());
  return result.ok
    ? respond({ ok: true, data: result.value }, 200)
    : respond({ ok: false, error: result.error.message.trim() }, 500);
}

function respond(body: ApiResponse<GraphData>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
