import { issueIdsByDescription, listIssues, readyIssues, withWorkSignals } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { respondBdOutcome, respondJson } from "@/server/web/http/routeResponse";
import { serverMessages } from "@/server/web/locale/serverMessages";
import { parseDescriptionSearch, parseIssueListFilter } from "@/shared/contract/issueList";

export async function handleIssueListRequest(request: Request): Promise<Response> {
  const filter = parseIssueListFilter(new URL(request.url).searchParams);
  if (!filter) {
    return respondJson({ ok: false, error: (await serverMessages()).invalidIssueStatus }, 400);
  }

  const cwd = currentWorkspaceRoot();
  const result =
    filter.kind === "ready"
      ? await readyIssues(cwd)
      : await withWorkSignals(cwd, listIssues(cwd, filter.statuses));
  return respondBdOutcome(result);
}

/** 목록 응답에는 설명이 없으므로, 설명 검색은 찾은 이슈의 id만 따로 돌려줍니다. */
export async function handleDescriptionSearchRequest(request: Request): Promise<Response> {
  const text = parseDescriptionSearch(new URL(request.url).searchParams);
  if (text === null) {
    return respondJson({ ok: false, error: (await serverMessages()).emptyDescriptionSearch }, 400);
  }
  return respondBdOutcome(await issueIdsByDescription(currentWorkspaceRoot(), text));
}
