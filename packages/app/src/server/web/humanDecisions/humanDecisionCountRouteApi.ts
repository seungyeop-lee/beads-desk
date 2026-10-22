import { readAwaitingHumanCount } from "@/server/modules/humanDecisions/application/awaitingHuman";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { respondBdOutcome } from "@/server/web/http/routeResponse";

export function handleHumanDecisionCountRequest(request: Request): Promise<Response> {
  return withRequestWorkspace(request, async (cwd) =>
    respondBdOutcome(await readAwaitingHumanCount(cwd)),
  );
}
