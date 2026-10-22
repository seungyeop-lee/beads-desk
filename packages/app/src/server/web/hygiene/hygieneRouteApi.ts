import { staleIssues } from "@beads-desk/bd";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { readHygieneReport } from "@/server/modules/hygiene/application/hygieneReport";
import { respondBdOutcome, respondBadRequest } from "@/server/web/http/routeResponse";
import { serverMessages } from "@/server/web/locale/serverMessages";
import { parseStaleDays } from "@/shared/contract/hygiene";

export function handleHygieneRequest(request: Request): Promise<Response> {
  return withRequestWorkspace(request, async (cwd) =>
    respondBdOutcome(await readHygieneReport(cwd)),
  );
}

export async function handleStaleIssuesRequest(request: Request): Promise<Response> {
  const staleDays = parseStaleDays(new URL(request.url).searchParams);
  if (staleDays === null) {
    return respondBadRequest((await serverMessages()).invalidStaleDays);
  }
  return withRequestWorkspace(request, async (cwd) =>
    respondBdOutcome(await staleIssues(cwd, staleDays)),
  );
}
