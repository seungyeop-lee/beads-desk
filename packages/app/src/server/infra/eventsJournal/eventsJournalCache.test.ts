import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { beforeEach, expect, test } from "vitest";
import { fakeBdWorkspace } from "@beads-desk/bd/fakeBd.testkit";
import { readEventsJournal } from "./eventsJournalCache";

const fakeBd = fakeBdWorkspace("beads-desk-events-journal-cache-");
let configFile: string;

beforeEach(async () => {
  configFile = join(fakeBd.workDir, "journal-config");
  await writeFile(configFile, "false");
  const record = {
    seq: 1,
    ts: "2026-10-22T13:13:15Z",
    op: "update",
    issue_id: "t-1",
    issue: { id: "t-1" },
  };
  // server mode workspace처럼 응답하는 가짜 bd입니다. DB 비교값은 늘 같고, journal 설정은 파일 내용으로 돌려줍니다.
  await fakeBd.useFakeBdScript(
    [
      'case "$*" in',
      `  "--sandbox dolt show --json") echo '{"embedded":false,"database":"demo"}';;`,
      `  "--sandbox sql SELECT DOLT_HASHOF_DB() AS h --json") echo '[{"h":"hash-1"}]';;`,
      `  "--sandbox config get events-journal --json") printf '{"key":"events-journal","value":"%s"}' "$(cat "${configFile}")";;`,
      `  "--sandbox events tail --since 0 --json") echo '${JSON.stringify(record)}';;`,
      "  *) exit 99;;",
      "esac",
    ].join("\n"),
  );
});

async function tailCount(): Promise<number> {
  const log = await fakeBd.callsLog();
  return log.split("\n").filter((line) => line.includes("events tail")).length;
}

test("journal이 꺼져 있으면 bd events tail을 실행하지 않고 null을 돌려준다", async () => {
  expect(await readEventsJournal(fakeBd.workDir)).toEqual({ ok: true, value: null });
  expect(await tailCount()).toBe(0);
});

test("journal을 켜면 설정을 매번 다시 읽어 레코드를 돌려주고, DB 비교값이 같은 동안에는 bd events tail을 한 번만 실행한다", async () => {
  await readEventsJournal(fakeBd.workDir);
  await writeFile(configFile, "true");

  const first = await readEventsJournal(fakeBd.workDir);
  await readEventsJournal(fakeBd.workDir);

  expect(first.ok && first.value?.map((record) => record.issueId)).toEqual(["t-1"]);
  expect(await tailCount()).toBe(1);
});
