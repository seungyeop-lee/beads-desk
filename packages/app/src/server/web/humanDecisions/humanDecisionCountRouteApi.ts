import { humanDecisionIssues } from "@beads-desk/bd";
import { awaitingHuman } from "@beads-desk/bd/issue";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { respondBdOutcome } from "@/server/web/http/routeResponse";

/** 어느 화면에서나 보이는 상단 탭이 쓰므로, 전체 목록 대신 개수에 필요한 이슈만 읽어 센 수를 돌려줍니다. */
export async function handleHumanDecisionCountRequest(): Promise<Response> {
  const result = await humanDecisionIssues(currentWorkspaceRoot());
  return respondBdOutcome(
    result.ok
      ? { ok: true, value: awaitingHuman(result.value.gates, result.value.labeled).count }
      : result,
  );
}
