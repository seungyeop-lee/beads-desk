import type { BdOutcome, JournalRecord } from "@beads-desk/bd";
import type { ExportedIssue } from "@beads-desk/bd/issue";
import { activityFeedPage } from "@/server/modules/activityFeed/domain/activityFeed";
import type { ActivityFeedPage, ActivityFeedQuery } from "@/shared/contract/activityFeed";

/** 이슈 export를 읽는 port입니다. application은 infra를 import하지 않으므로 호출자가 넘겨줍니다. */
export type IssueExportReader = (workspaceRoot: string) => Promise<BdOutcome<ExportedIssue[]>>;

/** events journal의 레코드를 읽는 port입니다. journal이 꺼져 있으면 null을 돌려줍니다. */
export type EventsJournalReader = (
  workspaceRoot: string,
) => Promise<BdOutcome<JournalRecord[] | null>>;

/**
 * workspace 전체의 만들기, 닫기, 댓글 기록을 이슈 목록 검색과 같은 `bd export` 캐시에서 모으고,
 * 이슈를 고친 기록을 events journal에서 더해 돌려줍니다.
 */
export async function readActivityFeedPage(
  exportedReader: IssueExportReader,
  journalReader: EventsJournalReader,
  cwd: string,
  query: ActivityFeedQuery,
): Promise<BdOutcome<ActivityFeedPage>> {
  const exported = await exportedReader(cwd);
  if (!exported.ok) return exported;
  const journal = await journalReader(cwd);
  if (!journal.ok) return journal;
  return { ok: true, value: activityFeedPage(exported.value, journal.value, query) };
}
