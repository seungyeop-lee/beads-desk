import { staleIssues } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { readHygieneReport } from "@/server/modules/hygiene/application/hygieneReport";
import { respondBdOutcome, respondJson } from "@/server/web/http/routeResponse";
import { serverMessages } from "@/server/web/locale/serverMessages";
import { parseStaleDays } from "@/shared/contract/hygiene";

export async function handleHygieneRequest(): Promise<Response> {
  return respondBdOutcome(await readHygieneReport(currentWorkspaceRoot()));
}

export async function handleStaleIssuesRequest(request: Request): Promise<Response> {
  const staleDays = parseStaleDays(new URL(request.url).searchParams);
  if (staleDays === null) {
    return respondJson({ ok: false, error: (await serverMessages()).invalidStaleDays }, 400);
  }
  return respondBdOutcome(await staleIssues(currentWorkspaceRoot(), staleDays));
}
