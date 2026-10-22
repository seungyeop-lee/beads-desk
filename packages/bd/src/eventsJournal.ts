import { isRecord, stringOr, timestampOr } from "./bdJson";
import { parseExportedIssue, type ExportedIssue } from "./issue";
import { commandError, outputError, runBd, runBdJson, type BdOutcome } from "./runBd";

/**
 * events journal(`bd events tail`)에 남은 이슈 변경 한 건입니다. 시각은 epoch ms이고 초 단위까지만 기록됩니다.
 * journal은 이 clone에서 쓴 변경만 담고, `bd dolt pull`로 들어온 변경은 담지 않습니다.
 */
export type JournalRecord = {
  /** 커밋 순서대로 하나씩 커지는 번호입니다. */
  seq: number;
  at: number;
  /**
   * create, update, close, delete, dep_add, dep_remove, comment 중 하나입니다.
   * 설명, 상태, 제목, 라벨을 고치거나 다시 열어도 update로 기록됩니다.
   */
  op: string;
  issueId: string;
  /** 기록되지 않았으면 빈 문자열입니다. */
  actor: string;
  /** 변경 뒤의 이슈 전체입니다. bd는 바뀐 필드를 따로 알려 주지 않습니다. delete이면 null입니다. */
  issue: ExportedIssue | null;
};

/** journal 설정 값 가운데 bd 1.3.1이 journal을 기록하는 값입니다. 그 밖의 값이면 기록하지 않는 것을 확인했습니다. */
const ENABLED_VALUES: ReadonlySet<string> = new Set(["true", "t", "1", "yes", "on"]);

/**
 * events journal이 켜져 있는지 읽습니다. journal은 기본으로 꺼져 있고, 켠 뒤의 변경만 기록됩니다.
 * `bd config get`은 `BD_EVENTS_JOURNAL` 환경 변수로 바꾼 값도 반영합니다.
 */
export async function eventsJournalEnabled(cwd: string): Promise<BdOutcome<boolean>> {
  const result = await runBdJson(cwd, ["config", "get", "events-journal", "--json"]);
  if (!result.ok) return result;
  const value = isRecord(result.value) ? result.value.value : undefined;
  if (typeof value !== "string") return outputError("unparsableOutput");
  return { ok: true, value: ENABLED_VALUES.has(value.toLowerCase()) };
}

/**
 * journal에 남은 레코드를 오래된 것부터 모두 읽습니다. bd는 기본으로 7일 또는 10만 건까지만 남깁니다.
 * 이미 지운 레코드부터 읽으라고 하면 bd가 빈 결과 대신 events_journal_truncated 오류로 실패하므로,
 * 그때는 오류에 담긴 남은 가장 오래된 번호(floor)부터 다시 읽습니다.
 */
export async function retainedJournalRecords(cwd: string): Promise<BdOutcome<JournalRecord[]>> {
  let result = await tailJournal(cwd, 0);
  const floor = truncatedFloor(result.stdout);
  if (result.code !== 0 && floor !== null) {
    result = await tailJournal(cwd, floor - 1);
  }
  if (result.code !== 0) return { ok: false, error: commandError(result) };

  const records: JournalRecord[] = [];
  for (const line of result.stdout.split("\n")) {
    if (line.trim() === "") continue;
    let record: unknown;
    try {
      record = JSON.parse(line);
    } catch {
      return outputError("unparsableOutput");
    }
    if (isRecord(record) && typeof record.seq === "number") {
      records.push({
        seq: record.seq,
        at: timestampOr(record.ts, 0),
        op: stringOr(record.op, ""),
        issueId: stringOr(record.issue_id, ""),
        actor: stringOr(record.actor, ""),
        issue: parseExportedIssue(record.issue),
      });
    }
  }
  return { ok: true, value: records };
}

function tailJournal(cwd: string, since: number) {
  return runBd(["events", "tail", "--since", String(since), "--json"], { cwd });
}

/** `--json`으로 실행한 bd는 events_journal_truncated 오류를 stdout에 JSON 하나로 출력합니다. 그 오류가 아니면 null입니다. */
function truncatedFloor(stdout: string): number | null {
  try {
    const output: unknown = JSON.parse(stdout);
    return isRecord(output) &&
      output.code === "events_journal_truncated" &&
      typeof output.floor === "number"
      ? output.floor
      : null;
  } catch {
    return null;
  }
}
