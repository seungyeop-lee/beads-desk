import { decisionRecords } from "@beads-desk/bd";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { respondBdOutcome } from "@/server/web/http/routeResponse";
import type { DecisionSummary } from "@/shared/contract/decisions";

export function handleDecisionsRequest(request: Request): Promise<Response> {
  return withRequestWorkspace(request, async (cwd) =>
    respondBdOutcome<DecisionSummary[]>(await decisionRecords(cwd)),
  );
}
