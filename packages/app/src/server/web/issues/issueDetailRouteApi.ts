import { showIssue } from "@beads-desk/bd";
import type { IssueDetail } from "@beads-desk/bd/issue";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";

export async function handleIssueDetailRequest(issueId: string): Promise<Response> {
  const result = await showIssue(currentWorkspaceRoot(), issueId);
  return result.ok
    ? respond({ ok: true, data: result.value }, 200)
    : respond({ ok: false, error: result.error.message.trim() }, 500);
}

function respond(body: ApiResponse<IssueDetail>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
