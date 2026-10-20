import { openChangeFingerprint, type ChangeFingerprint } from "@beads-desk/bd";

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
