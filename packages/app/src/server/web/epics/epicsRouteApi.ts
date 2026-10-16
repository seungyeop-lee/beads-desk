import { epicDescendants, epicStatuses, listIssues, withWorkSignals } from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type { EpicDescendants } from "@/shared/contract/epics";
import { waiterCounts } from "@/shared/domain/issues/waiterCounts";

export async function handleEpicsRequest(): Promise<Response> {
  return respond(await epicStatuses(currentWorkspaceRoot()));
}

/**
 * 후손 이슈와 함께 대기 수를 보내, 에픽 화면이 대기 수를 세려고 전체 이슈 목록을 따로 읽지 않게 합니다.
 * 후손을 고르는 데 이미 전체 목록을 읽으므로 bd 실행이 늘지 않고, 이슈 목록 화면과 같은 목록으로 셉니다.
 */
export async function handleEpicDescendantsRequest(epicId: string): Promise<Response> {
  const cwd = currentWorkspaceRoot();
  const result = await withWorkSignals(cwd, listIssues(cwd, []));
  if (!result.ok) return respond(result);

  const issues = epicDescendants(result.value, epicId);
  const counts = waiterCounts(result.value);
  const waiters = Object.fromEntries(
    issues.flatMap((issue) => {
      const count = counts.get(issue.id);
      return count ? [[issue.id, count]] : [];
    }),
  );
  return respond<EpicDescendants>({ ok: true, value: { issues, waiters } });
}

function respond<T>(
  result: { ok: true; value: T } | { ok: false; error: { message: string } },
): Response {
  const body: ApiResponse<T> = result.ok
    ? { ok: true, data: result.value }
    : { ok: false, error: result.error.message.trim() };
  return Response.json(body, {
    status: result.ok ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
