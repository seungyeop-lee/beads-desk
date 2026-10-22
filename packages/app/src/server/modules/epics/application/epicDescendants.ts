import { listIssues, type BdOutcome } from "@beads-desk/bd";
import { epicDescendants } from "@/server/modules/epics/domain/epicDescendants";
import type { EpicDescendants } from "@/shared/contract/epics";
import { waiterCounts } from "@/shared/domain/issues/waiterCounts";

/**
 * 에픽의 후손 이슈와 대기 수를 조립합니다.
 * 대기 수는 에픽 밖에서 기다리는 이슈까지 세야 이슈 목록 화면과 같은 값이 나오므로, 후손을 고르기 전의 전체 이슈 목록으로 계산합니다.
 * 대기 수는 후손을 고를 때 읽은 전체 목록을 그대로 쓰므로 bd를 더 실행하지 않습니다.
 * bd 실행은 이 목록 조회와, 목록이 함께 실행하는 bd blocked와 bd ready를 합해 세 번입니다.
 */
export async function readEpicDescendants(
  cwd: string,
  epicId: string,
): Promise<BdOutcome<EpicDescendants>> {
  const result = await listIssues(cwd, []);
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
