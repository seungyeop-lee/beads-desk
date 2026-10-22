import { describe, expect, test } from "vitest";
import { fakeBdWorkspace } from "./fakeBd.testkit";
import { eventsJournalEnabled, retainedJournalRecords } from "./eventsJournal";

const fakeBd = fakeBdWorkspace("beads-desk-events-journal-");
const { useFakeBd } = fakeBd;

const CONFIG_ARGS = "config get events-journal --json";

function configOutput(value: string): string {
  return JSON.stringify({ key: "events-journal", location: "config.yaml", value });
}

describe("eventsJournalEnabled", () => {
  test.each(["true", "TRUE", "1", "t", "yes", "on"])(
    "bd config get이 %s를 내놓으면 journal이 켜진 것으로 읽는다",
    async (value) => {
      await useFakeBd({ [CONFIG_ARGS]: { stdout: configOutput(value) } });

      expect(await eventsJournalEnabled(fakeBd.workDir)).toEqual({ ok: true, value: true });
    },
  );

  test.each(["false", "0", "no", "off", "y", ""])(
    "bd config get이 %s를 내놓으면 journal이 꺼진 것으로 읽는다",
    async (value) => {
      await useFakeBd({ [CONFIG_ARGS]: { stdout: configOutput(value) } });

      expect(await eventsJournalEnabled(fakeBd.workDir)).toEqual({ ok: true, value: false });
    },
  );
});

describe("retainedJournalRecords", () => {
  // bd 1.3.1의 bd events tail 출력에서 필드 이름과 형태를 옮긴 레코드입니다. 레코드마다 한 줄씩 출력합니다.
  const lines = [
    {
      seq: 5,
      ts: "2026-10-22T13:13:17Z",
      op: "update",
      issue_id: "t-1",
      actor: "alice",
      issue: {
        id: "t-1",
        title: "로그인 수정",
        description: "세션 토큰",
        status: "in_progress",
        priority: 2,
        issue_type: "task",
        labels: ["auth"],
        defer_until: "2026-11-30T15:00:00Z",
        created_at: "2026-10-22T13:13:15Z",
      },
    },
    {
      seq: 6,
      ts: "2026-10-22T13:13:18Z",
      op: "delete",
      issue_id: "t-2",
      actor: "bob",
      issue: null,
    },
  ]
    .map((record) => JSON.stringify(record))
    .join("\n");

  test("레코드마다 번호, 시각, 종류, 이슈, 수정한 사람과 수정 뒤의 이슈 상태를 읽고, 지운 이슈의 상태는 null로 읽는다", async () => {
    await useFakeBd({ "events tail --since 0 --json": { stdout: `${lines}\n` } });

    const result = await retainedJournalRecords(fakeBd.workDir);

    expect(result.ok && result.value).toEqual([
      {
        seq: 5,
        at: Date.parse("2026-10-22T13:13:17Z"),
        op: "update",
        issueId: "t-1",
        actor: "alice",
        issue: expect.objectContaining({
          id: "t-1",
          title: "로그인 수정",
          description: "세션 토큰",
          status: "in_progress",
          priority: 2,
          issueType: "task",
          labels: ["auth"],
          deferUntil: Date.parse("2026-11-30T15:00:00Z"),
        }),
      },
      {
        seq: 6,
        at: Date.parse("2026-10-22T13:13:18Z"),
        op: "delete",
        issueId: "t-2",
        actor: "bob",
        issue: null,
      },
    ]);
  });

  test("보존 기간이 지나 앞 레코드가 지워졌으면 남아 있는 가장 오래된 레코드부터 다시 읽는다", async () => {
    const truncated = JSON.stringify({
      code: "events_journal_truncated",
      error: "events journal truncated",
      floor: 5,
      head: 6,
      since: 0,
    });
    await useFakeBd({
      "events tail --since 0 --json": { stdout: truncated, stderr: "truncated", code: 1 },
      "events tail --since 4 --json": { stdout: lines },
    });

    const result = await retainedJournalRecords(fakeBd.workDir);

    expect(result.ok && result.value.map((record) => record.seq)).toEqual([5, 6]);
  });

  test("다른 이유로 실패하면 bd가 남긴 실패 이유를 돌려준다", async () => {
    await useFakeBd({
      "events tail --since 0 --json": { stderr: "database is locked", code: 1 },
    });

    expect(await retainedJournalRecords(fakeBd.workDir)).toEqual({
      ok: false,
      error: { message: "database is locked\n", exitCode: 1 },
    });
  });
});
