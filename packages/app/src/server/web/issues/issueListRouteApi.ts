import { listIssues, readyIssues } from "@beads-desk/bd";
import { readIssueExport } from "@/server/infra/issueExport/issueExportCache";
import { readIssueTextSearch } from "@/server/modules/issueSearch/application/issueTextSearch";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { respondBadRequest, respondBdOutcome } from "@/server/web/http/routeResponse";
import { serverMessages } from "@/server/web/locale/serverMessages";
import { parseIssueListFilter, parseIssueTextSearch } from "@/shared/contract/issueList";

export async function handleIssueListRequest(request: Request): Promise<Response> {
  const filter = parseIssueListFilter(new URL(request.url).searchParams);
  if (!filter) {
    return respondBadRequest((await serverMessages()).invalidIssueStatus);
  }

  return withRequestWorkspace(request, async (cwd) =>
    respondBdOutcome(
      filter.kind === "ready" ? await readyIssues(cwd) : await listIssues(cwd, filter.statuses),
    ),
  );
}

export async function handleIssueTextSearchRequest(request: Request): Promise<Response> {
  const text = parseIssueTextSearch(new URL(request.url).searchParams);
  if (text === null) {
    return respondBadRequest((await serverMessages()).emptyTextSearch);
  }
  return withRequestWorkspace(request, async (cwd) =>
    respondBdOutcome(await readIssueTextSearch(readIssueExport, cwd, text)),
  );
}
