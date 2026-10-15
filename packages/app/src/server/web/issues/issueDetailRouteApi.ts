import { issueEvents, showIssue } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";

export async function handleIssueDetailRequest(issueId: string): Promise<Response> {
  const result = await showIssue(currentWorkspaceRoot(), issueId);
  return result.ok
    ? respond({ ok: true, data: result.value }, 200)
    : respond({ ok: false, error: result.error.message.trim() }, 500);
}

export async function handleIssueHistoryRequest(issueId: string): Promise<Response> {
  const result = await issueEvents(currentWorkspaceRoot(), issueId);
  return result.ok
    ? respond({ ok: true, data: result.value }, 200)
    : respond({ ok: false, error: result.error.message.trim() }, 500);
}

function respond<T>(body: ApiResponse<T>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
