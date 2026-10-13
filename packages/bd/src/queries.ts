import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  isRecord,
  parseIssueDetail,
  parseIssues,
  type Issue,
  type IssueDetail,
  type IssueStatus,
} from "./issue";
import { inputError, runBdJson, type BdOutcome } from "./runBd";

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

/** bd 목록 명령의 기본 개수 제한(list 50, ready 100)에 걸려 목록이 조용히 잘리지 않도록 제한을 없앱니다. 0이 제한 없음입니다. */
const LIST_LIMIT = "0";

export function listIssues(cwd: string, statuses: IssueStatus[]): Promise<BdOutcome<Issue[]>> {
  return queryIssues(cwd, listArgs(statuses));
}

export function readyIssues(cwd: string): Promise<BdOutcome<Issue[]>> {
  return queryIssues(cwd, ["ready", "--limit", LIST_LIMIT, "--json"]);
}

export async function epicChildren(cwd: string, epicId: string): Promise<BdOutcome<Issue[]>> {
  const id = epicId.trim();
  // bd children은 빈 id를 parent 조건 없음으로 해석해 workspace의 모든 이슈를 돌려줍니다.
  if (id.length === 0) {
    return inputError("epic id가 비어 있습니다.");
  }
  return queryIssues(cwd, ["children", id, "--json"]);
}

export async function showIssue(cwd: string, issueId: string): Promise<BdOutcome<IssueDetail>> {
  const id = issueId.trim();
  // bd show는 id가 없으면 마지막으로 다룬 이슈를 보여 줍니다.
  if (id.length === 0) {
    return inputError("이슈 id가 비어 있습니다.");
  }
  const result = await runBdJson(cwd, [
    "show",
    "--json",
    "--include-comments",
    "--include-dependents",
    "--",
    id,
  ]);
  if (!result.ok) {
    return result;
  }
  const detail = parseIssueDetail(Array.isArray(result.value) ? result.value[0] : result.value);
  return detail
    ? { ok: true, value: detail }
    : { ok: false, error: { message: "bd show 출력에 이슈가 없습니다.", exitCode: 0 } };
}

/**
 * epic마다 직접 하위 이슈 수와 닫힌 하위 이슈 수를 셉니다.
 * bd epic status는 하위 이슈가 없거나 닫힌 epic을 돌려주지 않아, 모든 이슈를 한 번에 읽고 parent로 묶어 셉니다.
 */
export async function epicStatuses(cwd: string): Promise<BdOutcome<EpicStatus[]>> {
  const result = await queryIssues(cwd, listArgs([]));
  if (!result.ok) {
    return result;
  }
  const childrenByParent = new Map<string, Issue[]>();
  for (const issue of result.value) {
    if (issue.parent) {
      childrenByParent.set(issue.parent, [...(childrenByParent.get(issue.parent) ?? []), issue]);
    }
  }
  return {
    ok: true,
    value: result.value
      .filter((issue) => issue.issueType === "epic")
      .map((epic) => {
        const children = childrenByParent.get(epic.id) ?? [];
        const closedChildren = children.filter((child) => child.status === "closed").length;
        return {
          epic,
          totalChildren: children.length,
          closedChildren,
          eligibleForClose:
            epic.status !== "closed" && children.length > 0 && closedChildren === children.length,
        };
      }),
  };
}

// 한 이슈가 여러 열의 조회 결과에 나오면 뒤에 있는 열이 우선합니다.
const BOARD_COLUMNS: { column: BoardColumn; args: string[] }[] = [
  { column: "closed", args: listArgs(["closed"]) },
  { column: "ready", args: ["ready", "--limit", LIST_LIMIT, "--json"] },
  { column: "in_progress", args: listArgs(["in_progress"]) },
  // bd blocked는 의존 관계 때문에 막힌 이슈만 돌려주고, 상태를 blocked로 둔 이슈는 ready에도 blocked에도 나오지 않습니다.
  { column: "blocked", args: listArgs(["blocked"]) },
  { column: "blocked", args: ["blocked", "--json"] },
];

export async function boardIssues(cwd: string): Promise<BdOutcome<BoardIssue[]>> {
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
export async function openChangeFingerprint(cwd: string): Promise<BdOutcome<ChangeFingerprint>> {
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

// 상태를 지정하지 않으면 --all로 조회합니다. --status를 비우면 bd가 기본 필터(closed 제외)를 쓰고,
// 알려진 상태를 모두 나열하면 pinned, hooked와 사용자 정의 상태가 빠집니다.
function listArgs(statuses: IssueStatus[]): string[] {
  const filter = statuses.length > 0 ? ["--status", statuses.join(",")] : ["--all"];
  return ["list", "--json", "--tree=false", ...filter, "--limit", LIST_LIMIT];
}

async function queryIssues(cwd: string, args: string[]): Promise<BdOutcome<Issue[]>> {
  const result = await runBdJson(cwd, args);
  return result.ok ? { ok: true, value: parseIssues(result.value) } : result;
}
