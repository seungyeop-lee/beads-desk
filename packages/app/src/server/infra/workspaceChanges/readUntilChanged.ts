import type { BdOutcome } from "@beads-desk/bd";
import { globalState } from "@/server/infra/globalState/globalState";
import { sharedChangeFingerprintReader } from "@/server/infra/workspaceChanges/changeFingerprintReader";

type WorkspaceRead<T> = {
  readFingerprint: () => Promise<string | null>;
  /** 마지막으로 읽은 결과와, 그 결과를 읽기 전에 읽은 DB 비교값입니다. */
  cached: { fingerprint: string; value: T } | null;
};

/**
 * workspace마다 read의 결과를 남겨 두고, DB 비교값이 지난번과 같으면 read를 다시 실행하지 않고 지난 결과를 돌려주는 함수를 만듭니다.
 * 비교값은 read보다 먼저 읽습니다. 그 사이에 쓰기가 있었다면 다음 호출에서 비교값이 달라져 다시 읽게 하기 위해서입니다.
 * 비교값을 읽지 못하면 캐시를 쓰지 않습니다.
 * route handler마다 module 사본이 따로 생기므로, 결과는 key로 process 전역에 둡니다.
 */
export function readUntilChanged<T>(
  key: symbol,
  read: (workspaceRoot: string) => Promise<BdOutcome<T>>,
): (workspaceRoot: string) => Promise<BdOutcome<T>> {
  return async (workspaceRoot) => {
    const workspaces = globalState(key, () => new Map<string, WorkspaceRead<T>>());
    let state = workspaces.get(workspaceRoot);
    if (!state) {
      state = { readFingerprint: sharedChangeFingerprintReader(workspaceRoot), cached: null };
      workspaces.set(workspaceRoot, state);
    }
    const fingerprint = await state.readFingerprint();
    if (fingerprint !== null && state.cached?.fingerprint === fingerprint) {
      return { ok: true, value: state.cached.value };
    }
    const result = await read(workspaceRoot);
    state.cached = result.ok && fingerprint !== null ? { fingerprint, value: result.value } : null;
    return result;
  };
}
