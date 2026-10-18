import { humanGates, previousGateRounds } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { respondBdOutcome } from "@/server/web/http/routeResponse";

export async function handleHumanGatesRequest(): Promise<Response> {
  return respondBdOutcome(await humanGates(currentWorkspaceRoot()));
}

/** 고른 gate와 같은 작업을 막았던 닫힌 gate(이전 라운드)의 기록을 읽습니다. */
export async function handlePreviousGateRoundsRequest(gateId: string): Promise<Response> {
  return respondBdOutcome(await previousGateRounds(currentWorkspaceRoot(), gateId));
}
