import { chmod, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { subscribeWorkspaceChanges } from "./workspaceChangeFeed";

const POLL_INTERVAL_MS = 50;

let workDir: string;
let hashFile: string;
let callLog: string;
const originalBdBin = process.env.BD_BIN;

beforeEach(async () => {
  workDir = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-feed-")));
  hashFile = join(workDir, "hash");
  callLog = join(workDir, "calls.log");
  await writeFile(hashFile, "hash-1");
  // server mode workspace처럼 응답하고, DB hash는 파일 내용으로 돌려주는 가짜 bd입니다.
  const fakeBd = join(workDir, "fake-bd");
  await writeFile(
    fakeBd,
    [
      "#!/bin/sh",
      `echo "$*" >> "${callLog}"`,
      'case "$*" in',
      `  "--sandbox dolt show --json") echo '{"embedded":false,"database":"demo"}';;`,
      `  "--sandbox sql SELECT DOLT_HASHOF_DB() AS h --json") printf '[{"h":"%s"}]' "$(cat "${hashFile}")";;`,
      "  *) exit 99;;",
      "esac",
    ].join("\n"),
  );
  await chmod(fakeBd, 0o755);
  process.env.BD_BIN = fakeBd;
});

afterEach(() => {
  process.env.BD_BIN = originalBdBin;
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** bd 실행 시간은 부하에 따라 달라지므로 고정된 시간 대신 조건이 맞을 때까지 기다립니다. */
async function waitUntil(condition: () => boolean | Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (!(await condition())) {
    if (Date.now() > deadline) throw new Error("조건을 기다리다 시간이 초과됐습니다.");
    await sleep(10);
  }
}

async function hashQueryCount(): Promise<number> {
  const log = await readFile(callLog, "utf8").catch(() => "");
  return log.split("\n").filter((line) => line.includes("DOLT_HASHOF_DB")).length;
}

test("DB 상태가 바뀌면 구독자에게 한 번 알린다", async () => {
  let notified = 0;
  const unsubscribe = subscribeWorkspaceChanges(workDir, () => notified++, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  // 두 번째 조회가 시작됐다면 첫 조회로 기준값을 읽은 뒤입니다.
  await waitUntil(async () => (await hashQueryCount()) >= 2);
  await writeFile(hashFile, "hash-2");
  await waitUntil(() => notified > 0);
  const afterChange = await hashQueryCount();
  await waitUntil(async () => (await hashQueryCount()) >= afterChange + 2);
  unsubscribe();

  expect(notified).toBe(1);
});

test("DB 상태가 그대로이면 알리지 않는다", async () => {
  let notified = 0;
  const unsubscribe = subscribeWorkspaceChanges(workDir, () => notified++, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  await waitUntil(async () => (await hashQueryCount()) >= 4);
  unsubscribe();

  expect(notified).toBe(0);
});

test("마지막 구독자가 떠나면 조회를 멈춘다", async () => {
  const first = subscribeWorkspaceChanges(workDir, () => {}, { pollIntervalMs: POLL_INTERVAL_MS });
  const second = subscribeWorkspaceChanges(workDir, () => {}, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });
  await waitUntil(async () => (await hashQueryCount()) >= 2);
  first();
  const afterFirstLeaves = await hashQueryCount();
  await waitUntil(async () => (await hashQueryCount()) >= afterFirstLeaves + 2);
  second();
  // 떠나기 전에 시작된 조회는 끝까지 실행될 수 있으므로 잠시 기다린 뒤의 횟수를 기준으로 삼습니다.
  await sleep(POLL_INTERVAL_MS * 6);
  const afterLeave = await hashQueryCount();
  await sleep(POLL_INTERVAL_MS * 6);

  expect(await hashQueryCount()).toBe(afterLeave);
});
