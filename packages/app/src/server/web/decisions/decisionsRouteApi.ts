import { decisionRecords } from "@beads-desk/bd";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { respondBdOutcome } from "@/server/web/http/routeResponse";

export function handleDecisionsRequest(request: Request): Promise<Response> {
  return withRequestWorkspace(request, async (cwd) => respondBdOutcome(await decisionRecords(cwd)));
}
