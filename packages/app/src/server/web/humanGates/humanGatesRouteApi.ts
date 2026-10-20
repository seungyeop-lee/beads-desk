import { humanGates, previousGateRounds } from "@beads-desk/bd";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { respondBdOutcome } from "@/server/web/http/routeResponse";

export function handleHumanGatesRequest(request: Request): Promise<Response> {
  return withRequestWorkspace(request, async (cwd) => respondBdOutcome(await humanGates(cwd)));
}

/** 고른 gate와 같은 작업을 막았던 닫힌 gate(이전 라운드)의 기록을 읽습니다. */
export function handlePreviousGateRoundsRequest(
  request: Request,
  gateId: string,
): Promise<Response> {
  return withRequestWorkspace(request, async (cwd) =>
    respondBdOutcome(await previousGateRounds(cwd, gateId)),
  );
}
