import { lastIssueSnapshot, type BdOutcome, type JournalRecord } from "@beads-desk/bd";
import type { Issue } from "@beads-desk/bd/issue";
import { globalState } from "@/server/infra/globalState/globalState";

/** workspace 경로마다, `<이슈 id>:<delete 레코드의 seq>`로 찾는 삭제 직전 스냅샷입니다. */
type SnapshotsByWorkspace = Map<string, Map<string, Issue | null>>;

/**
 * journal의 delete 레코드마다 지운 이슈의 삭제 직전 스냅샷을 읽어 seq로 찾는 map으로 돌려줍니다.
 * 지운 이슈의 스냅샷은 바뀌지 않으므로 한 번 읽은 결과는 DB가 바뀌어도 서버 프로세스가 끝날 때까지 다시 읽지 않습니다.
 * 같은 id를 다시 만들었다가 지울 수 있어 삭제 한 건마다 seq를 함께 키로 씁니다.
 * deletions에 없는 삭제의 결과는 journal 보존 기간이 지나 다시 쓰이지 않으므로, 모두 읽고 나면 지웁니다.
 * 읽기에 실패하면 오류를 돌려주고, 그 삭제는 다음 조회에서 다시 읽습니다.
 */
export async function readDeletedIssueSnapshots(
  workspaceRoot: string,
  deletions: readonly JournalRecord[],
): Promise<BdOutcome<ReadonlyMap<number, Issue | null>>> {
  const workspaces = globalState(
    Symbol.for("beads-desk.deletedIssueSnapshots"),
    (): SnapshotsByWorkspace => new Map(),
  );
  const snapshots = workspaces.get(workspaceRoot) ?? new Map<string, Issue | null>();
  workspaces.set(workspaceRoot, snapshots);

  const bySeq = new Map<number, Issue | null>();
  for (const deletion of deletions) {
    const key = snapshotKey(deletion);
    if (!snapshots.has(key)) {
      const result = await lastIssueSnapshot(workspaceRoot, deletion.issueId);
      if (!result.ok) return result;
      snapshots.set(key, result.value);
    }
    bySeq.set(deletion.seq, snapshots.get(key) ?? null);
  }
  const current = new Set(deletions.map(snapshotKey));
  for (const key of snapshots.keys()) {
    if (!current.has(key)) snapshots.delete(key);
  }
  return { ok: true, value: bySeq };
}

function snapshotKey({ issueId, seq }: JournalRecord): string {
  return `${issueId}:${seq}`;
}
