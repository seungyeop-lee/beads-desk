import { epicChildren, epicStatuses } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";

export async function handleEpicsRequest(): Promise<Response> {
  return respond(await epicStatuses(currentWorkspaceRoot()));
}

export async function handleEpicChildrenRequest(epicId: string): Promise<Response> {
  return respond(await epicChildren(currentWorkspaceRoot(), epicId));
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
