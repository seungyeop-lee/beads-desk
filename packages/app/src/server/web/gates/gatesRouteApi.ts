import { openGates } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { respondBdOutcome } from "@/server/web/http/routeResponse";

export async function handleOpenGatesRequest(): Promise<Response> {
  return respondBdOutcome(await openGates(currentWorkspaceRoot()));
}
