import { epicStatuses } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { readEpicDescendants } from "@/server/modules/epics/application/epicDescendants";
import { respondBdOutcome } from "@/server/web/http/routeResponse";

export async function handleEpicsRequest(): Promise<Response> {
  return respondBdOutcome(await epicStatuses(currentWorkspaceRoot()));
}

export async function handleEpicDescendantsRequest(epicId: string): Promise<Response> {
  return respondBdOutcome(await readEpicDescendants(currentWorkspaceRoot(), epicId));
}
