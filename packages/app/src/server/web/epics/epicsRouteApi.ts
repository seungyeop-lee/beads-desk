import { epicStatuses } from "@beads-desk/bd";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { readEpicDescendants } from "@/server/modules/epics/application/epicDescendants";
import { respondBdOutcome } from "@/server/web/http/routeResponse";
import type { EpicSummary } from "@/shared/contract/epics";

export function handleEpicsRequest(request: Request): Promise<Response> {
  return withRequestWorkspace(request, async (cwd) =>
    respondBdOutcome<EpicSummary[]>(await epicStatuses(cwd)),
  );
}

export function handleEpicDescendantsRequest(request: Request, epicId: string): Promise<Response> {
  return withRequestWorkspace(request, async (cwd) =>
    respondBdOutcome(await readEpicDescendants(cwd, epicId)),
  );
}
