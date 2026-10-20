import { openGates } from "@beads-desk/bd";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { respondBdOutcome } from "@/server/web/http/routeResponse";

export function handleOpenGatesRequest(request: Request): Promise<Response> {
  return withRequestWorkspace(request, async (cwd) => respondBdOutcome(await openGates(cwd)));
}
