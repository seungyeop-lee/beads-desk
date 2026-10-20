import { dependencyGraph } from "@beads-desk/bd";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { respondBdOutcome } from "@/server/web/http/routeResponse";

/**
 * 닫힌 이슈까지 돌려주고, 표시 범위는 각 그래프 보기에서 고릅니다.
 * 에픽 보기는 닫힌 후손을, 이슈 중심 보기는 닫힌 선행·후속 이슈도 유지합니다.
 */
export function handleGraphRequest(request: Request): Promise<Response> {
  return withRequestWorkspace(request, async (cwd) => respondBdOutcome(await dependencyGraph(cwd)));
}
