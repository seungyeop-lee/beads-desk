import { boardIssues } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { respondBdOutcome } from "@/server/web/http/routeResponse";

export async function handleBoardRequest(): Promise<Response> {
  return respondBdOutcome(await boardIssues(currentWorkspaceRoot()));
}
