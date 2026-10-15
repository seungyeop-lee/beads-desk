import { issueIdsByDescription, listIssues, readyIssues, withWorkSignals } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { serverMessages } from "@/server/web/locale/serverMessages";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { parseDescriptionSearch, parseIssueListFilter } from "@/shared/contract/issueList";

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

/** 목록 응답에는 설명이 없으므로, 설명 검색은 찾은 이슈의 id만 따로 돌려줍니다. */
export async function handleDescriptionSearchRequest(request: Request): Promise<Response> {
  const text = parseDescriptionSearch(new URL(request.url).searchParams);
  if (text === null) {
    return respond({ ok: false, error: (await serverMessages()).emptyDescriptionSearch }, 400);
  }
  const result = await issueIdsByDescription(currentWorkspaceRoot(), text);
  return result.ok
    ? respond({ ok: true, data: result.value }, 200)
    : respond({ ok: false, error: result.error.message.trim() }, 500);
}

function respond<T>(body: ApiResponse<T>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
