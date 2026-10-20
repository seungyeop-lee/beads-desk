import { exportedIssues, type BdOutcome } from "@beads-desk/bd";
import type { ExportedIssue } from "@beads-desk/bd/issue";
import { globalState } from "@/server/infra/globalState/globalState";
import { changeFingerprintReader } from "@/server/infra/workspaceChanges/changeFingerprintReader";

type WorkspaceExport = {
  readFingerprint: () => Promise<string | null>;
  /** 마지막으로 읽은 export와, 그 export를 읽기 전에 읽은 DB 비교값입니다. */
  cached: { fingerprint: string; issues: ExportedIssue[] } | null;
};

// route handler마다 module 사본이 따로 생기므로, 캐시를 process 전역에 둡니다.
const EXPORTS_KEY = Symbol.for("beads-desk.issueExports");

function workspaceExports(): Map<string, WorkspaceExport> {
  return globalState(EXPORTS_KEY, () => new Map<string, WorkspaceExport>());
}

/**
 * workspace의 `bd export` 결과를 읽습니다. DB 비교값이 지난번과 같으면 bd export를 다시 실행하지 않고 지난 결과를 돌려줍니다.
 * 비교값은 export보다 먼저 읽습니다. 그 사이에 쓰기가 있었다면 다음 호출에서 비교값이 달라져 다시 읽게 하기 위해서입니다.
 * 비교값을 읽지 못하면 캐시를 쓰지 않습니다.
 */
export async function readIssueExport(workspaceRoot: string): Promise<BdOutcome<ExportedIssue[]>> {
  let state = workspaceExports().get(workspaceRoot);
  if (!state) {
    state = { readFingerprint: changeFingerprintReader(workspaceRoot), cached: null };
    workspaceExports().set(workspaceRoot, state);
  }
  const fingerprint = await state.readFingerprint();
  if (fingerprint !== null && state.cached?.fingerprint === fingerprint) {
    return { ok: true, value: state.cached.issues };
  }
  const result = await exportedIssues(workspaceRoot);
  state.cached = result.ok && fingerprint !== null ? { fingerprint, issues: result.value } : null;
  return result;
}
