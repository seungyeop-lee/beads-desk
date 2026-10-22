import { type BdOutcome } from "@beads-desk/bd";
import type { ExportedIssue } from "@beads-desk/bd/issue";
import { activityFeedPage } from "@/server/modules/activityFeed/domain/activityFeed";
import type { ActivityFeedPage, ActivityFeedQuery } from "@/shared/contract/activityFeed";

/** 이슈 export를 읽는 port입니다. application은 infra를 import하지 않으므로 호출자가 넘겨줍니다. */
export type IssueExportReader = (workspaceRoot: string) => Promise<BdOutcome<ExportedIssue[]>>;

/** workspace 전체의 만들기, 닫기, 댓글 기록을 이슈 목록 검색과 같은 `bd export` 캐시에서 모아 돌려줍니다. */
export async function readActivityFeedPage(
  exportedReader: IssueExportReader,
  cwd: string,
  query: ActivityFeedQuery,
): Promise<BdOutcome<ActivityFeedPage>> {
  const exported = await exportedReader(cwd);
  if (!exported.ok) return exported;
  return { ok: true, value: activityFeedPage(exported.value, query) };
}
