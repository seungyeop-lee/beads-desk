import {
  duplicateCandidates,
  epicStatuses,
  lintFindings,
  orphanIssues,
  staleIssues,
} from "@beads-desk/bd";
import { currentWorkspaceRoot } from "@/server/infra/runtime/serverRuntime";
import { respondBdOutcome, respondJson } from "@/server/web/http/routeResponse";
import { serverMessages } from "@/server/web/locale/serverMessages";
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
  if (!orphans.ok) return respondBdOutcome(orphans);
  if (!lint.ok) return respondBdOutcome(lint);
  if (!duplicates.ok) return respondBdOutcome(duplicates);
  if (!epics.ok) return respondBdOutcome(epics);

  const report: HygieneReport = {
    orphans: orphans.value,
    lint: lint.value,
    duplicates: duplicates.value,
    closableEpics: epics.value.filter(isClosableEpic).map(({ epic }) => epic),
  };
  return respondJson({ ok: true, data: report });
}

export async function handleStaleIssuesRequest(request: Request): Promise<Response> {
  const staleDays = parseStaleDays(new URL(request.url).searchParams);
  if (staleDays === null) {
    return respondJson({ ok: false, error: (await serverMessages()).invalidStaleDays }, 400);
  }
  return respondBdOutcome(await staleIssues(currentWorkspaceRoot(), staleDays));
}
