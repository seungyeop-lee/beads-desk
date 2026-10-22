import {
  eventsJournalEnabled,
  retainedJournalRecords,
  type BdOutcome,
  type JournalRecord,
} from "@beads-desk/bd";
import { readUntilChanged } from "@/server/infra/workspaceChanges/readUntilChanged";

const readRecords = readUntilChanged(
  Symbol.for("beads-desk.eventsJournals"),
  retainedJournalRecords,
);

/**
 * workspace의 events journal에 남은 레코드를 읽습니다. journal이 꺼져 있으면 null입니다.
 * 설정은 DB 비교값에 드러나지 않아 매번 읽고, 레코드는 DB 비교값이 지난번과 같으면 bd를 다시 실행하지 않고 지난 결과를 돌려줍니다.
 */
export async function readEventsJournal(
  workspaceRoot: string,
): Promise<BdOutcome<JournalRecord[] | null>> {
  const enabled = await eventsJournalEnabled(workspaceRoot);
  if (!enabled.ok) return enabled;
  return enabled.value ? readRecords(workspaceRoot) : { ok: true, value: null };
}
