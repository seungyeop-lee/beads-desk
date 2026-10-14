import { epicDescendants, epicStatuses, withWorkSignals } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";

export async function handleEpicsRequest(): Promise<Response> {
  return respond(await epicStatuses(currentWorkspaceRoot()));
}

export async function handleEpicDescendantsRequest(epicId: string): Promise<Response> {
  const cwd = currentWorkspaceRoot();
  return respond(await withWorkSignals(cwd, epicDescendants(cwd, epicId)));
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
