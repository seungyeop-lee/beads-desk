import { issueEvents, showIssue } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { respondBdOutcome } from "@/server/web/http/routeResponse";

export async function handleIssueDetailRequest(issueId: string): Promise<Response> {
  return respondBdOutcome(await showIssue(currentWorkspaceRoot(), issueId));
}

export async function handleIssueHistoryRequest(issueId: string): Promise<Response> {
  return respondBdOutcome(await issueEvents(currentWorkspaceRoot(), issueId));
}
