import { openChangeFingerprint, type ChangeFingerprint } from "@beads-desk/bd";
import { globalState } from "@/server/infra/globalState/globalState";

/**
 * workspace DB 상태를 비교할 값을 읽는 함수를 만듭니다. 그 함수는 값을 읽지 못하면 null을 돌려줍니다.
 * 읽는 방법은 처음 읽을 때 `dolt show`로 정하고, 읽지 못하면 버렸다가 다음 호출에서 다시 정합니다.
 * 함수를 오래 들고 있는 동안 workspace의 Dolt mode나 DB 위치가 바뀌어 남은 방법으로 읽지 못하게 되면 새 방법으로 바꿔야 하기 때문입니다.
 */
export function changeFingerprintReader(workspaceRoot: string): () => Promise<string | null> {
  let fingerprint: ChangeFingerprint | null = null;
  return async () => {
    if (!fingerprint) {
      const opened = await openChangeFingerprint(workspaceRoot);
      if (!opened.ok) return null;
      fingerprint = opened.value;
    }
    const current = await fingerprint();
    if (current === null) fingerprint = null;
    return current;
  };
}

// route handler마다 module 사본이 따로 생기므로, workspace마다 reader를 하나만 두고 export 캐시와 변경 알림이 함께 쓰게 process 전역에 둡니다.
const READERS_KEY = Symbol.for("beads-desk.changeFingerprintReaders");

/**
 * workspace마다 변경 비교값 reader를 하나만 만들어 돌려줍니다. reader는 호출할 때마다 지금 값을 읽으므로,
 * 함께 쓰는 쪽이 조회를 더해도 다른 쪽의 비교 기준은 바뀌지 않습니다.
 */
export function sharedChangeFingerprintReader(workspaceRoot: string): () => Promise<string | null> {
  const readers = globalState(READERS_KEY, () => new Map<string, () => Promise<string | null>>());
  let reader = readers.get(workspaceRoot);
  if (!reader) {
    reader = changeFingerprintReader(workspaceRoot);
    readers.set(workspaceRoot, reader);
  }
  return reader;
}
