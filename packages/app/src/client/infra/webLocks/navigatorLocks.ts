// 브라우저의 Web Locks API(navigator.locks) 통로입니다. 탭 사이에 조정할 상태는 이 파일의 helper로만 lock에 표시합니다.

/** name의 shared lock을 잡고 잡는 순간 held를 부릅니다. 반환한 함수를 부르면 lock을 놓고, 잡은 탭이 닫히면 브라우저가 풀어 줍니다. */
export function holdSharedLock(name: string, held?: () => void): () => void {
  const release = new AbortController();
  navigator.locks
    .request(name, { mode: "shared", signal: release.signal }, () => {
      held?.();
      const hold = Promise.withResolvers<void>();
      release.signal.addEventListener("abort", () => hold.resolve(), { once: true });
      return hold.promise;
    })
    // lock을 얻기 전에 반환한 함수로 놓으면 잡기 전 요청이 취소됩니다.
    .catch(() => {});
  return () => release.abort();
}

/** prefix로 시작하는 lock을 지금 잡은 탭들이 prefix 다음에 적은 값의 목록입니다. 탭이 닫히면 브라우저가 lock을 풀어 목록에서 사라집니다. */
export async function heldSharedLockNames(prefix: string): Promise<string[]> {
  const { held = [] } = await navigator.locks.query();
  return held.flatMap(({ name }) => (name?.startsWith(prefix) ? [name.slice(prefix.length)] : []));
}

/**
 * name의 exclusive lock을 잡을 수 있으면 잡아 held의 promise가 끝날 때까지 유지하고 true를 돌려줍니다.
 * 다른 탭이 잡고 있으면 held를 부르지 않고 false를 돌려줍니다.
 */
export async function tryExclusiveLock(
  name: string,
  held: () => Promise<unknown>,
): Promise<boolean> {
  let acquired = false;
  await navigator.locks.request(name, { ifAvailable: true }, (lock) => {
    if (!lock) return false;
    acquired = true;
    return held();
  });
  return acquired;
}

/** 다른 탭이 name의 exclusive lock을 놓을 때까지 기다렸다가 잡고 held의 promise가 끝날 때까지 유지합니다. 기다리는 동안 signal이 취소되면 요청을 거부합니다. */
export async function waitForExclusiveLock(
  name: string,
  signal: AbortSignal,
  held: () => Promise<unknown>,
): Promise<void> {
  await navigator.locks.request(name, { signal }, () => held());
}
