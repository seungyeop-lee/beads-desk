import {
  duplicateCandidates,
  epicStatuses,
  lintFindings,
  orphanIssues,
  staleIssues,
  type BdOutcome,
} from "@beads-desk/bd";
import type { Issue } from "@beads-desk/bd/issue";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { serverMessages } from "@/server/web/locale/serverMessages";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { parseStaleDays, type HygieneReport } from "@/shared/contract/hygiene";
import { isClosableEpic } from "@/shared/domain/epics/closableEpic";

/** 기준 일수와 관계없는 정리 점검을 한 번에 읽습니다. 하나라도 실패하면 일부 카드만 비어 보이지 않도록 오류를 돌려줍니다. */
export async function handleHygieneRequest(): Promise<Response> {
  const cwd = currentWorkspaceRoot();
  const [orphans, lint, duplicates, epics] = await Promise.all([
    orphanIssues(cwd),
    lintFindings(cwd),
    duplicateCandidates(cwd),
    epicStatuses(cwd),
  ]);
  if (!orphans.ok) return failed(orphans);
  if (!lint.ok) return failed(lint);
  if (!duplicates.ok) return failed(duplicates);
  if (!epics.ok) return failed(epics);

  return respond<HygieneReport>(
    {
      ok: true,
      data: {
        orphans: orphans.value,
        lint: lint.value,
        duplicates: duplicates.value,
        closableEpics: epics.value.filter(isClosableEpic).map(({ epic }) => epic),
      },
    },
    200,
  );
}

export async function handleStaleIssuesRequest(request: Request): Promise<Response> {
  const staleDays = parseStaleDays(new URL(request.url).searchParams);
  if (staleDays === null) {
    return respond({ ok: false, error: (await serverMessages()).invalidStaleDays }, 400);
  }
  const result = await staleIssues(currentWorkspaceRoot(), staleDays);
  return result.ok ? respond<Issue[]>({ ok: true, data: result.value }, 200) : failed(result);
}

function failed(result: Extract<BdOutcome<unknown>, { ok: false }>): Response {
  return respond({ ok: false, error: result.error.message.trim() }, 500);
}

function respond<T>(body: ApiResponse<T>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
