import { expect, test } from "vitest";
import type { JournalRecord } from "@beads-desk/bd/types";
import { fakeBdWorkspace } from "@beads-desk/bd/fakeBd.testkit";
import { readDeletedIssueSnapshots } from "./deletedIssueSnapshotCache";

const fakeBd = fakeBdWorkspace("beads-desk-deleted-snapshots-");

function deletion(seq: number, issueId: string): JournalRecord {
  return { seq, at: 0, op: "delete", issueId, actor: "agent", issue: null };
}

function history(issueId: string, title: string) {
  return {
    [`history --json --limit 1 -- ${issueId}`]: {
      stdout: JSON.stringify([{ Issue: { id: issueId, title, issue_type: "task" } }]),
    },
  };
}

async function historyCount(issueId: string): Promise<number> {
  const log = await fakeBd.callsLog();
  return log.split("\n").filter((line) => line.endsWith(`history --json --limit 1 -- ${issueId}`))
    .length;
}

test("삭제마다 삭제 직전 스냅샷을 seq로 돌려주고, 같은 삭제는 다시 조회해도 bd history를 한 번만 실행한다", async () => {
  await fakeBd.useFakeBd({
    ...history("t-1", "지운 작업"),
    "history --json --limit 1 -- t-2": { stdout: "null" },
  });
  const deletions = [deletion(3, "t-1"), deletion(5, "t-2")];

  const first = await readDeletedIssueSnapshots(fakeBd.workDir, deletions);
  await readDeletedIssueSnapshots(fakeBd.workDir, deletions);

  expect(first.ok && first.value.get(3)?.title).toBe("지운 작업");
  expect(first.ok && first.value.get(5)).toBeNull();
  expect(await historyCount("t-1")).toBe(1);
  expect(await historyCount("t-2")).toBe(1);
});

test("같은 id라도 다른 삭제는 따로 읽고, 넘겨받지 않은 삭제의 결과는 지워 다시 넘기면 다시 읽는다", async () => {
  await fakeBd.useFakeBd(history("t-1", "지운 작업"));

  await readDeletedIssueSnapshots(fakeBd.workDir, [deletion(3, "t-1")]);
  await readDeletedIssueSnapshots(fakeBd.workDir, [deletion(3, "t-1"), deletion(8, "t-1")]);
  await readDeletedIssueSnapshots(fakeBd.workDir, [deletion(8, "t-1")]);
  await readDeletedIssueSnapshots(fakeBd.workDir, [deletion(3, "t-1")]);

  expect(await historyCount("t-1")).toBe(3);
});

test("bd history가 실패하면 오류를 돌려주고 그 삭제는 다음 조회에서 다시 읽는다", async () => {
  await fakeBd.useFakeBd({
    "history --json --limit 1 -- t-1": { stderr: "database is locked", code: 1 },
  });

  const failed = await readDeletedIssueSnapshots(fakeBd.workDir, [deletion(3, "t-1")]);
  await fakeBd.useFakeBd(history("t-1", "지운 작업"));
  const retried = await readDeletedIssueSnapshots(fakeBd.workDir, [deletion(3, "t-1")]);

  expect(failed.ok).toBe(false);
  expect(retried.ok && retried.value.get(3)?.title).toBe("지운 작업");
  expect(await historyCount("t-1")).toBe(2);
});
