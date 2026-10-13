import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  ISSUE_STATUSES,
  isRecord,
  parseIssue,
  parseIssues,
  type Issue,
  type IssueStatus,
} from "./issue";
import { runBd } from "./runBd";

export type BdError = {
  message: string;
  /** 입력이 잘못되어 bd를 실행하지 않았으면 null입니다. */
  exitCode: number | null;
};

export type BdQueryResult<T> = { ok: true; value: T } | { ok: false; error: BdError };

export type EpicStatus = {
  epic: Issue;
  totalChildren: number;
  closedChildren: number;
  eligibleForClose: boolean;
};

export type BoardColumn = "ready" | "in_progress" | "blocked" | "closed";

export type BoardIssue = {
  column: BoardColumn;
  issue: Issue;
};

/** bd 목록 명령의 기본 개수 제한(list 50, ready 100)에 걸려 목록이 조용히 잘리지 않도록 넉넉히 지정합니다. */
const LIST_LIMIT = "1000";

export function listIssues(cwd: string, statuses: IssueStatus[]): Promise<BdQueryResult<Issue[]>> {
  return queryIssues(cwd, listArgs(statuses));
}

export function readyIssues(cwd: string): Promise<BdQueryResult<Issue[]>> {
  return queryIssues(cwd, ["ready", "--limit", LIST_LIMIT, "--json"]);
}

export async function epicChildren(cwd: string, epicId: string): Promise<BdQueryResult<Issue[]>> {
  const id = epicId.trim();
  // bd children은 빈 id를 parent 조건 없음으로 해석해 workspace의 모든 이슈를 돌려줍니다.
  if (id.length === 0) {
    return { ok: false, error: { message: "epic id가 비어 있습니다.", exitCode: null } };
  }
  return queryIssues(cwd, ["children", id, "--json"]);
}

export async function epicStatuses(cwd: string): Promise<BdQueryResult<EpicStatus[]>> {
  const result = await runBdJson(cwd, ["epic", "status", "--json"]);
  if (!result.ok) {
    return result;
  }
  const entries = Array.isArray(result.value) ? result.value : [];
  return {
    ok: true,
    value: entries.map(parseEpicStatus).filter((status): status is EpicStatus => status !== null),
  };
}

// 한 이슈가 여러 열의 조회 결과에 나오면 뒤에 있는 열이 우선합니다.
const BOARD_COLUMNS: { column: BoardColumn; args: string[] }[] = [
  { column: "closed", args: listArgs(["closed"]) },
  { column: "ready", args: ["ready", "--limit", LIST_LIMIT, "--json"] },
  { column: "in_progress", args: listArgs(["in_progress"]) },
  { column: "blocked", args: ["blocked", "--json"] },
];

export async function boardIssues(cwd: string): Promise<BdQueryResult<BoardIssue[]>> {
  const results = await Promise.all(BOARD_COLUMNS.map(({ args }) => queryIssues(cwd, args)));
  const failure = results.find((result) => !result.ok);
  if (failure && results.every((result) => !result.ok)) {
    return failure;
  }

  const byId = new Map<string, BoardIssue>();
  results.forEach((result, index) => {
    if (result.ok) {
      for (const issue of result.value) {
        byId.set(issue.id, { column: BOARD_COLUMNS[index].column, issue });
      }
    }
  });
  return { ok: true, value: [...byId.values()] };
}

/** 읽을 때마다 workspace DB 상태를 나타내는 값을 돌려줍니다. 두 값이 같으면 그 사이에 쓰기가 없었습니다. */
export type ChangeFingerprint = () => Promise<string | null>;

/**
 * workspace DB의 변경 여부를 비교할 값을 읽는 함수를 만듭니다. 값을 읽지 못하면 그 함수는 null을 돌려줍니다.
 *
 * bd 1.3.1에서 확인한 동작에 기대고 있습니다.
 * - embedded mode의 bd는 조회할 때도 manifest 파일을 같은 내용으로 다시 써서, 파일 변경 이벤트로는 읽기와 쓰기를 구분할 수 없습니다. 쓰기가 있을 때만 내용이 바뀝니다.
 * - server mode에서는 쓰기가 있어도 manifest 파일이 바뀌지 않고, `bd sql`은 embedded mode에서 지원되지 않습니다.
 */
export async function openChangeFingerprint(
  cwd: string,
): Promise<BdQueryResult<ChangeFingerprint>> {
  const result = await runBdJson(cwd, ["dolt", "show", "--json"]);
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
  const result = await runBdJson(cwd, ["sql", "SELECT DOLT_HASHOF_DB() AS h", "--json"]);
  const row = result.ok && Array.isArray(result.value) ? result.value[0] : null;
  return isRecord(row) && typeof row.h === "string" ? row.h : null;
}

// bd list는 빈 --status를 기본 필터(closed 제외)로 해석하므로, 상태를 지정하지 않으면 모든 상태를 넘깁니다.
function listArgs(statuses: IssueStatus[]): string[] {
  const status = (statuses.length > 0 ? statuses : ISSUE_STATUSES).join(",");
  return ["list", "--json", "--tree=false", "--status", status, "--limit", LIST_LIMIT];
}

async function queryIssues(cwd: string, args: string[]): Promise<BdQueryResult<Issue[]>> {
  const result = await runBdJson(cwd, args);
  return result.ok ? { ok: true, value: parseIssues(result.value) } : result;
}

async function runBdJson(cwd: string, args: string[]): Promise<BdQueryResult<unknown>> {
  const result = await runBd(args, { cwd });
  if (result.code !== 0) {
    const message = result.stderr.trim()
      ? result.stderr
      : `bd가 종료 코드 ${result.code}로 실패했습니다.`;
    return { ok: false, error: { message, exitCode: result.code } };
  }
  try {
    return { ok: true, value: JSON.parse(result.stdout) };
  } catch {
    return {
      ok: false,
      error: { message: "bd 출력을 JSON으로 해석하지 못했습니다.", exitCode: 0 },
    };
  }
}

function parseEpicStatus(value: unknown): EpicStatus | null {
  if (!isRecord(value) || !isRecord(value.epic)) {
    return null;
  }
  // 이전 bd 버전의 epic status 출력에 삭제된 epic이 섞여 나와 beads-ui(#44)에서 걸러 냈습니다.
  if (value.epic.status === "tombstone" || value.epic.deleted_at != null) {
    return null;
  }
  const epic = parseIssue(value.epic);
  if (!epic) {
    return null;
  }
  return {
    epic,
    totalChildren: typeof value.total_children === "number" ? value.total_children : 0,
    closedChildren: typeof value.closed_children === "number" ? value.closed_children : 0,
    eligibleForClose: value.eligible_for_close === true,
  };
}
