import { epicDescendants, listIssues, withWorkSignals, type BdOutcome } from "@beads-desk/bd";
import type { EpicDescendants } from "@/shared/contract/epics";
import { waiterCounts } from "@/shared/domain/issues/waiterCounts";

/**
 * 에픽의 후손 이슈와 대기 수를 조립합니다.
 * 대기 수는 에픽 밖에서 기다리는 이슈까지 세야 이슈 목록 화면과 같은 값이 나오므로, 후손을 고르기 전의 전체 이슈 목록으로 계산합니다.
 * 후손을 고르는 데 이미 전체 목록을 읽으므로 bd 실행은 이 목록 조회 하나뿐입니다.
 */
export async function readEpicDescendants(
  cwd: string,
  epicId: string,
): Promise<BdOutcome<EpicDescendants>> {
  const result = await withWorkSignals(cwd, listIssues(cwd, []));
  if (!result.ok) return result;

  const issues = epicDescendants(result.value, epicId);
  const counts = waiterCounts(result.value);
  const waiters = Object.fromEntries(
    issues.flatMap((issue) => {
      const count = counts.get(issue.id);
      return count ? [[issue.id, count]] : [];
    }),
  );
  return { ok: true, value: { issues, waiters } };
}
