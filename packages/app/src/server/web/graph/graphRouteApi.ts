import { dependencyGraph } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type { GraphData } from "@/shared/contract/graph";

/** 에픽 보기는 닫힌 후손 이슈도 그리므로 닫힌 이슈까지 읽습니다. 이슈 중심 보기는 받은 뒤 닫힌 이슈를 뺍니다. */
export async function handleGraphRequest(): Promise<Response> {
  const result = await dependencyGraph(currentWorkspaceRoot(), true);
  return result.ok
    ? respond({ ok: true, data: result.value }, 200)
    : respond({ ok: false, error: result.error.message.trim() }, 500);
}

function respond(body: ApiResponse<GraphData>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
