import { readIssueExport } from "@/server/infra/issueExport/issueExportCache";
import { activityFeedPage } from "@/server/modules/activityFeed/domain/activityFeed";
import { withRequestWorkspace } from "@/server/web/http/requestWorkspace";
import { respondBdOutcome, respondJson } from "@/server/web/http/routeResponse";
import { serverMessages } from "@/server/web/locale/serverMessages";
import { parseActivityFeedQuery } from "@/shared/contract/activityFeed";

/** workspace 전체의 만들기, 닫기, 댓글 기록을 이슈 목록 검색과 같은 `bd export` 캐시에서 모아 돌려줍니다. */
export async function handleActivityFeedRequest(request: Request): Promise<Response> {
  const query = parseActivityFeedQuery(new URL(request.url).searchParams);
  if (query === null) {
    return respondJson(
      { ok: false, error: (await serverMessages()).invalidActivityFeedQuery },
      400,
    );
  }
  return withRequestWorkspace(request, async (cwd) => {
    const exported = await readIssueExport(cwd);
    return respondBdOutcome(
      exported.ok ? { ok: true, value: activityFeedPage(exported.value, query) } : exported,
    );
  });
}
