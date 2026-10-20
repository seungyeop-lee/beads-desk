import { issueEvents, showIssue } from "@beads-desk/bd";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { respondBdOutcome } from "@/server/web/http/routeResponse";

export function handleIssueDetailRequest(request: Request, issueId: string): Promise<Response> {
  return withRequestWorkspace(request, async (cwd) =>
    respondBdOutcome(await showIssue(cwd, issueId)),
  );
}

export function handleIssueHistoryRequest(request: Request, issueId: string): Promise<Response> {
  return withRequestWorkspace(request, async (cwd) =>
    respondBdOutcome(await issueEvents(cwd, issueId)),
  );
}
