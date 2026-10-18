import { decisionRecords } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { respondBdOutcome } from "@/server/web/http/routeResponse";

export async function handleDecisionsRequest(): Promise<Response> {
  return respondBdOutcome(await decisionRecords(currentWorkspaceRoot()));
}
