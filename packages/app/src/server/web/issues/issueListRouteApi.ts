import { listIssues, readyIssues, withWorkSignals } from "@beads-desk/bd";
import type { Issue } from "@beads-desk/bd/issue";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { serverMessages } from "@/server/web/locale/serverMessages";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { parseIssueListFilter } from "@/shared/contract/issueList";

export async function handleIssueListRequest(request: Request): Promise<Response> {
  const filter = parseIssueListFilter(new URL(request.url).searchParams);
  if (!filter) {
    return respond({ ok: false, error: (await serverMessages()).invalidIssueStatus }, 400);
  }

  const cwd = currentWorkspaceRoot();
  const result =
    filter.kind === "ready"
      ? await readyIssues(cwd)
      : await withWorkSignals(cwd, listIssues(cwd, filter.statuses));
  return result.ok
    ? respond({ ok: true, data: result.value }, 200)
    : respond({ ok: false, error: result.error.message.trim() }, 500);
}

function respond(body: ApiResponse<Issue[]>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
