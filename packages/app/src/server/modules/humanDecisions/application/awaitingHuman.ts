import { humanDecisionIssues, type BdOutcome } from "@beads-desk/bd";
import type { HumanDecisionItem } from "@/shared/contract/humanDecisions";
import { awaitingHuman } from "@/shared/domain/issues/awaitingHuman";

/**
 * 어느 화면에서나 보이는 상단 탭이 쓰므로, 전체 목록 대신 개수에 필요한 이슈만 읽어 센 수를 돌려줍니다.
 * 상단 탭의 개수와 기준이 어긋나지 않도록 목록 조회와 같은 조립을 공유합니다.
 */
export async function readAwaitingHumanCount(cwd: string): Promise<BdOutcome<number>> {
  const result = await readAwaitingHuman(cwd);
  if (!result.ok) return result;
  return { ok: true, value: result.value.count };
}

/**
 * 판단 기다림이 새로 생겼는지 id로 비교할 수 있도록, 개수 조회와 같은 이슈를 읽어 id와 제목만 돌려줍니다.
 * 상단 탭의 개수와 기준이 어긋나지 않도록 같은 `awaitingHuman`으로 고릅니다.
 */
export async function readAwaitingHumanItems(cwd: string): Promise<BdOutcome<HumanDecisionItem[]>> {
  const result = await readAwaitingHuman(cwd);
  if (!result.ok) return result;
  return {
    ok: true,
    value: [...result.value.gates, ...result.value.questions].map(({ id, title }) => ({
      id,
      title,
    })),
  };
}

async function readAwaitingHuman(cwd: string) {
  const result = await humanDecisionIssues(cwd);
  if (!result.ok) return result;
  return { ok: true as const, value: awaitingHuman(result.value.gates, result.value.labeled) };
}
