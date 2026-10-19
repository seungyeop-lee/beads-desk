import { rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, expect, test } from "vitest";
import { fakeBdWorkspace } from "@/server/infra/fakeBd";
import { checkWorkspaceChangesNow, subscribeWorkspaceChanges } from "./workspaceChangeFeed";

const POLL_INTERVAL_MS = 50;

const fakeBd = fakeBdWorkspace("beads-desk-feed-");
let workDir: string;
let hashFile: string;
/** 이 파일이 있으면 가짜 bd가 실패합니다. */
let failFlag: string;

beforeEach(async () => {
  workDir = fakeBd.workDir;
  hashFile = join(workDir, "hash");
  failFlag = join(workDir, "fail");
  await writeHash("hash-1");
  // server mode workspace처럼 응답하고, DB hash는 파일 내용으로 돌려주는 가짜 bd입니다.
  await fakeBd.useFakeBdScript(
    [
      `[ -e "${failFlag}" ] && exit 1`,
      'case "$*" in',
      `  "--sandbox dolt show --json") echo '{"embedded":false,"database":"demo"}';;`,
      `  "--sandbox sql SELECT DOLT_HASHOF_DB() AS h --json") printf '[{"h":"%s"}]' "$(cat "${hashFile}")";;`,
      "  *) exit 99;;",
      "esac",
    ].join("\n"),
  );
});

/**
 * writeFile은 파일을 비운 뒤 내용을 쓰므로, 그 사이에 가짜 bd가 읽으면 빈 hash를 변경으로 보고 한 번 더 알립니다.
 * 실제 DB hash에는 이런 중간 값이 없으므로, 다른 파일에 쓴 뒤 이름을 바꿔 한 번에 교체합니다.
 */
async function writeHash(value: string): Promise<void> {
  const staged = `${hashFile}.tmp`;
  await writeFile(staged, value);
  await rename(staged, hashFile);
}

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

async function bdCallCount(command: string): Promise<number> {
  const log = await fakeBd.callsLog().catch(() => "");
  return log.split("\n").filter((line) => line.includes(command)).length;
}

function hashQueryCount(): Promise<number> {
  return bdCallCount("DOLT_HASHOF_DB");
}

test("처음 기준값을 읽으면 한 번 알리고, 상태가 그대로이면 더 알리지 않는다", async () => {
  let notified = 0;
  const unsubscribe = subscribeWorkspaceChanges(workDir, () => notified++, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  await waitUntil(async () => (await hashQueryCount()) >= 4);
  unsubscribe();

  expect(notified).toBe(1);
});

test("처음 조회가 끝나기 전에 함께 구독한 listener도 기준값을 읽은 뒤 한 번 알림을 받는다", async () => {
  let first = 0;
  let second = 0;
  const stopFirst = subscribeWorkspaceChanges(workDir, () => first++, { pollIntervalMs: 60_000 });
  const stopSecond = subscribeWorkspaceChanges(workDir, () => second++, { pollIntervalMs: 60_000 });

  await waitUntil(() => first === 1);
  stopFirst();
  stopSecond();

  expect(second).toBe(1);
});

test("이미 기준값을 읽은 feed에 구독하면 그 listener에게 바로 알리고, 상태가 바뀌면 같이 알림을 받는다", async () => {
  let first = 0;
  let second = 0;
  const stopFirst = subscribeWorkspaceChanges(workDir, () => first++, { pollIntervalMs: 60_000 });
  await waitUntil(() => first === 1);

  const stopSecond = subscribeWorkspaceChanges(workDir, () => second++, { pollIntervalMs: 60_000 });
  expect(second).toBe(1);
  expect(first).toBe(1);
  await sleep(100);
  expect(second).toBe(1);

  await writeHash("hash-2");
  await checkWorkspaceChangesNow(workDir);
  stopFirst();
  stopSecond();

  expect(first).toBe(2);
  expect(second).toBe(2);
});

test("처음 조회에서 DB 상태를 읽지 못해도 한 번 알리고, 계속 읽지 못하면 더 알리지 않는다", async () => {
  await writeFile(failFlag, "");
  let notified = 0;
  const unsubscribe = subscribeWorkspaceChanges(workDir, () => notified++, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  await waitUntil(async () => (await bdCallCount("dolt show")) >= 4);
  unsubscribe();

  expect(notified).toBe(1);
});

test("DB 상태를 읽지 못하다가 읽게 되면 한 번 더 알린다", async () => {
  await writeFile(failFlag, "");
  let notified = 0;
  const unsubscribe = subscribeWorkspaceChanges(workDir, () => notified++, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });
  await waitUntil(() => notified === 1);

  await rm(failFlag);
  await waitUntil(async () => (await hashQueryCount()) >= 3);
  unsubscribe();

  expect(notified).toBe(2);
});

test("DB 상태가 바뀌면 구독자에게 한 번 더 알린다", async () => {
  let notified = 0;
  const unsubscribe = subscribeWorkspaceChanges(workDir, () => notified++, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  // 두 번째 조회가 시작됐다면 첫 조회로 기준값을 읽은 뒤입니다.
  await waitUntil(async () => (await hashQueryCount()) >= 2);
  await writeHash("hash-2");
  await waitUntil(() => notified > 1);
  const afterChange = await hashQueryCount();
  await waitUntil(async () => (await hashQueryCount()) >= afterChange + 2);
  unsubscribe();

  expect(notified).toBe(2);
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

test("마지막 구독자가 떠난 뒤 다시 구독하면 dolt show를 다시 실행하지 않고 새 listener에게 한 번 알린다", async () => {
  let first = 0;
  const stopFirst = subscribeWorkspaceChanges(workDir, () => first++, { pollIntervalMs: 60_000 });
  await waitUntil(() => first === 1);
  stopFirst();

  let second = 0;
  const stopSecond = subscribeWorkspaceChanges(workDir, () => second++, { pollIntervalMs: 60_000 });
  expect(second).toBe(1);
  await sleep(100);
  stopSecond();

  expect(second).toBe(1);
  expect(await bdCallCount("dolt show")).toBe(1);
});

test("구독자가 모두 떠나 있는 동안 DB 상태가 바뀌면 다시 구독한 listener에게 변경을 한 번 더 알린다", async () => {
  const stopFirst = subscribeWorkspaceChanges(workDir, () => {}, { pollIntervalMs: 60_000 });
  await checkWorkspaceChangesNow(workDir);
  stopFirst();
  await writeHash("hash-2");

  let notified = 0;
  const stopSecond = subscribeWorkspaceChanges(workDir, () => notified++, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });
  await waitUntil(() => notified === 2);
  const afterChange = await hashQueryCount();
  await waitUntil(async () => (await hashQueryCount()) >= afterChange + 2);
  stopSecond();

  expect(notified).toBe(2);
});

test("DB 상태를 읽지 못하면 다음 조회에서 dolt show로 읽는 방법을 다시 정한다", async () => {
  let notified = 0;
  const unsubscribe = subscribeWorkspaceChanges(workDir, () => notified++, {
    pollIntervalMs: POLL_INTERVAL_MS,
  });
  await waitUntil(() => notified === 1);

  await writeFile(failFlag, "");
  await waitUntil(async () => (await bdCallCount("dolt show")) >= 2);
  unsubscribe();

  expect(notified).toBe(1);
});

test("구독자가 모두 떠난 뒤에는 확인 요청에 bd를 실행하지 않는다", async () => {
  const unsubscribe = subscribeWorkspaceChanges(workDir, () => {}, { pollIntervalMs: 60_000 });
  await checkWorkspaceChangesNow(workDir);
  unsubscribe();
  const afterLeave = await hashQueryCount();

  await checkWorkspaceChangesNow(workDir);

  expect(await hashQueryCount()).toBe(afterLeave);
});

test("쓰기 직후 확인을 요청하면 다음 주기를 기다리지 않고 알린다", async () => {
  let notified = 0;
  const unsubscribe = subscribeWorkspaceChanges(workDir, () => notified++, {
    pollIntervalMs: 60_000,
  });
  await waitUntil(() => notified === 1);

  await writeHash("hash-2");
  await checkWorkspaceChangesNow(workDir);
  unsubscribe();

  expect(notified).toBe(2);
});

test("조회 중에 확인을 요청하면 그 조회가 끝난 뒤 새로 읽고 나서 끝난다", async () => {
  const unsubscribe = subscribeWorkspaceChanges(workDir, () => {}, { pollIntervalMs: 60_000 });

  // 구독하자마자 시작한 첫 조회는 쓰기보다 먼저 값을 읽었을 수 있습니다.
  await checkWorkspaceChangesNow(workDir);
  unsubscribe();

  expect(await hashQueryCount()).toBe(2);
});

test("구독자가 없으면 확인 요청에 bd를 실행하지 않는다", async () => {
  await checkWorkspaceChangesNow(workDir);

  expect(await hashQueryCount()).toBe(0);
});
