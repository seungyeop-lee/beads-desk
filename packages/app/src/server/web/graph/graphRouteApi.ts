import { dependencyGraph } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { parseIncludeClosed, type GraphData } from "@/shared/contract/graph";

export async function handleGraphRequest(request: Request): Promise<Response> {
  const includeClosed = parseIncludeClosed(new URL(request.url).searchParams);
  const result = await dependencyGraph(currentWorkspaceRoot(), includeClosed);
  return result.ok
    ? respond({ ok: true, data: result.value }, 200)
    : respond({ ok: false, error: result.error.message.trim() }, 500);
}

function respond(body: ApiResponse<GraphData>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
