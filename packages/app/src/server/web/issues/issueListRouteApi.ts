import { listIssues, readyIssues, withWorkSignals } from "@beads-desk/bd";
import { readIssueExport } from "@/server/infra/issueExport/issueExportCache";
import { searchIssueText } from "@/server/modules/issueSearch/domain/issueTextSearch";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { respondBdOutcome, respondJson } from "@/server/web/http/routeResponse";
import { serverMessages } from "@/server/web/locale/serverMessages";
import { parseIssueListFilter, parseIssueTextSearch } from "@/shared/contract/issueList";

export async function handleIssueListRequest(request: Request): Promise<Response> {
  const filter = parseIssueListFilter(new URL(request.url).searchParams);
  if (!filter) {
    return respondJson({ ok: false, error: (await serverMessages()).invalidIssueStatus }, 400);
  }

  return withRequestWorkspace(request, async (cwd) =>
    respondBdOutcome(
      filter.kind === "ready"
        ? await readyIssues(cwd)
        : await withWorkSignals(cwd, listIssues(cwd, filter.statuses)),
    ),
  );
}

/** 목록 응답에는 본문 필드와 댓글이 없으므로, 그 내용에서 검색어를 찾은 이슈와 맞은 곳은 따로 돌려줍니다. */
export async function handleIssueTextSearchRequest(request: Request): Promise<Response> {
  const text = parseIssueTextSearch(new URL(request.url).searchParams);
  if (text === null) {
    return respondJson({ ok: false, error: (await serverMessages()).emptyTextSearch }, 400);
  }
  return withRequestWorkspace(request, async (cwd) => {
    const exported = await readIssueExport(cwd);
    return respondBdOutcome(
      exported.ok ? { ok: true, value: searchIssueText(exported.value, text) } : exported,
    );
  });
}
