import { boardIssues } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type { BoardItem } from "@/shared/contract/board";

export async function handleBoardRequest(): Promise<Response> {
  const result = await boardIssues(currentWorkspaceRoot());
  return result.ok
    ? respond({ ok: true, data: result.value }, 200)
    : respond({ ok: false, error: result.error.message.trim() }, 500);
}

function respond(body: ApiResponse<BoardItem[]>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
