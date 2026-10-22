import { humanDecisionIssues } from "@beads-desk/bd";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { respondBdOutcome } from "@/server/web/http/routeResponse";
import type { HumanDecisionItem } from "@/shared/contract/humanDecisions";
import { awaitingHuman } from "@/shared/domain/issues/awaitingHuman";

/**
 * 판단 기다림이 새로 생겼는지 id로 비교할 수 있도록, 개수 조회와 같은 이슈를 읽어 id와 제목만 돌려줍니다.
 * 상단 탭의 개수와 기준이 어긋나지 않도록 같은 `awaitingHuman`으로 고릅니다.
 */
export function handleHumanDecisionItemsRequest(request: Request): Promise<Response> {
  return withRequestWorkspace(request, async (cwd) => {
    const result = await humanDecisionIssues(cwd);
    if (!result.ok) return respondBdOutcome(result);
    const { gates, questions } = awaitingHuman(result.value.gates, result.value.labeled);
    const items: HumanDecisionItem[] = [...gates, ...questions].map(({ id, title }) => ({
      id,
      title,
    }));
    return respondBdOutcome({ ok: true, value: items });
  });
}
