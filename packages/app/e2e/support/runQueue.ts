import { link, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const POLL_INTERVAL = 1_000;
/** `runE2e.ts`가 lock을 잡은 뒤 Playwright에 자기 pid를 이 환경 변수로 넘깁니다. */
const HELD_LOCK_ENV = "BEADS_DESK_E2E_LOCK_OWNER";

/**
 * Playwright global setup입니다. `pnpm exec playwright test`로 바로 실행했을 때 차례를 기다린 뒤 lock을 잡습니다.
 * `pnpm run test:e2e`는 `runE2e.ts`가 빌드 전에 이미 lock을 잡았으므로 기다리지 않고, lock도 그 스크립트가 놓습니다.
 * 반환한 함수는 Playwright가 실행이 끝날 때 teardown으로 호출합니다.
 */
export default async function waitForTurnInPlaywright(): Promise<
  (() => Promise<void>) | undefined
> {
  const heldBy = Number(process.env[HELD_LOCK_ENV]);
  if (heldBy && (await ownerOf(lockPath())) === heldBy) return undefined;
  return (await waitForTurn()).release;
}

/** 이 환경 변수를 자식 프로세스에 넘기면, 그 안의 Playwright global setup이 같은 lock을 다시 기다리지 않습니다. */
export function heldLockEnv(): Record<string, string> {
  return { [HELD_LOCK_ENV]: String(process.pid) };
}

/**
 * 같은 사용자의 e2e 실행이 하나씩 돌도록, 다른 worktree의 실행이 끝날 때까지 기다린 뒤 lock을 잡습니다.
 * 실행 하나가 worker 8개로 CPU를 거의 다 쓰므로 둘을 겹쳐 돌리면 둘 다 느려지고, 조회가 expect timeout을 넘겨 실패합니다.
 * lock을 잡은 실행이 비정상으로 끝나 lock만 남았으면 그 lock은 무시합니다.
 */
export async function waitForTurn(): Promise<{ waitedMs: number; release: () => Promise<void> }> {
  const path = lockPath();
  const startedAt = Date.now();
  let waitingFor: number | undefined;
  while (!(await acquire(path))) {
    const owner = await ownerOf(path);
    if (owner !== undefined && !isProcessRunning(owner)) {
      await rm(path, { force: true });
      continue;
    }
    if (owner !== undefined && owner !== waitingFor) {
      console.log(`다른 e2e 실행(pid ${owner})이 끝나기를 기다립니다.`);
      waitingFor = owner;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
  const waitedMs = Date.now() - startedAt;
  if (waitingFor !== undefined) console.log(`차례를 ${formatSeconds(waitedMs)} 기다렸습니다.`);
  return { waitedMs, release: () => rm(path, { force: true }) };
}

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}초`;
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // 프로세스는 있지만 signal을 보낼 권한이 없으면 EPERM입니다.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** RAM disk global setup이 TMPDIR을 바꾸기 전에 읽으므로, 모든 실행이 같은 lock 경로를 봅니다. */
function lockPath(): string {
  return join(tmpdir(), "beads-desk-e2e.lock");
}

/** pid를 쓴 임시 파일을 lock 이름으로 hard link해, lock 파일이 항상 주인 pid를 담은 채로 생기게 합니다. */
async function acquire(lockPath: string): Promise<boolean> {
  const candidate = `${lockPath}.${process.pid}`;
  await writeFile(candidate, String(process.pid));
  try {
    await link(candidate, lockPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  } finally {
    await rm(candidate, { force: true });
  }
}

/** lock이 없거나 읽는 사이 사라졌으면 undefined를 돌려줍니다. */
async function ownerOf(lockPath: string): Promise<number | undefined> {
  try {
    return Number(await readFile(lockPath, "utf8"));
  } catch {
    return undefined;
  }
}
