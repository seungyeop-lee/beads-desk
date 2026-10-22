import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isRecord } from "./bdJson";
import { runBdJson, type BdOutcome } from "./runBd";

/** 읽을 때마다 workspace DB 상태를 나타내는 값을 돌려줍니다. 두 값이 같으면 그 사이에 쓰기가 없었습니다. */
export type ChangeFingerprint = () => Promise<string | null>;

/**
 * workspace DB의 변경 여부를 비교할 값을 읽는 함수를 만듭니다. 값을 읽지 못하면 그 함수는 null을 돌려줍니다.
 * 이 함수와 돌려주는 함수가 실행하는 bd는 화면 조회보다 먼저 실행합니다. 조회가 실행 큐에 쌓여 있어도 변경 알림이 늦어지지 않게 하기 위해서입니다.
 *
 * bd 1.3.1에서 확인한 동작에 기대고 있습니다.
 * - embedded mode의 bd는 조회할 때도 manifest 파일을 같은 내용으로 다시 써서, 파일 변경 이벤트로는 읽기와 쓰기를 구분할 수 없습니다. 쓰기가 있을 때만 내용이 바뀝니다.
 * - server mode에서는 쓰기가 있어도 manifest 파일이 바뀌지 않고, `bd sql`은 embedded mode에서 지원되지 않습니다.
 */
export async function openChangeFingerprint(cwd: string): Promise<BdOutcome<ChangeFingerprint>> {
  const result = await runBdJson(cwd, ["dolt", "show", "--json"], { watch: true });
  if (!result.ok) {
    return result;
  }
  const dolt = isRecord(result.value) ? result.value : {};
  if (
    dolt.embedded === true &&
    typeof dolt.data_dir === "string" &&
    typeof dolt.database === "string"
  ) {
    const manifest = join(dolt.data_dir, dolt.database, ".dolt", "noms", "manifest");
    return { ok: true, value: () => readFile(manifest, "utf8").catch(() => null) };
  }
  return { ok: true, value: () => databaseHash(cwd) };
}

async function databaseHash(cwd: string): Promise<string | null> {
  const result = await runBdJson(cwd, ["sql", "SELECT DOLT_HASHOF_DB() AS h", "--json"], {
    watch: true,
  });
  const row = result.ok && Array.isArray(result.value) ? result.value[0] : null;
  return isRecord(row) && typeof row.h === "string" ? row.h : null;
}
