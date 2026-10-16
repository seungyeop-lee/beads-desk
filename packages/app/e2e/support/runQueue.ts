import { link, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const POLL_INTERVAL = 1_000;

/**
 * Playwright global setup입니다. 같은 사용자의 e2e 실행이 하나씩 돌도록, 다른 worktree의 실행이 끝날 때까지 기다린 뒤 lock을 잡습니다.
 * 실행 하나가 worker 8개로 CPU를 거의 다 쓰므로 둘을 겹쳐 돌리면 둘 다 느려지고, 조회가 expect timeout을 넘겨 실패합니다.
 * lock을 잡은 실행이 비정상으로 끝나 lock만 남았으면 그 lock은 무시합니다.
 * 반환한 함수는 Playwright가 실행이 끝날 때 teardown으로 호출합니다.
 */
export default async function waitForTurn(): Promise<() => Promise<void>> {
  // RAM disk global setup이 TMPDIR을 바꾸기 전에 실행되므로, 모든 실행이 같은 lock 경로를 봅니다.
  const lockPath = join(tmpdir(), "beads-desk-e2e.lock");
  let waitingFor: number | undefined;
  while (!(await acquire(lockPath))) {
    const owner = await ownerOf(lockPath);
    if (owner !== undefined && !isProcessRunning(owner)) {
      await rm(lockPath, { force: true });
      continue;
    }
    if (owner !== undefined && owner !== waitingFor) {
      console.log(`다른 e2e 실행(pid ${owner})이 끝나기를 기다립니다.`);
      waitingFor = owner;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
  return async () => {
    await rm(lockPath, { force: true });
  };
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
