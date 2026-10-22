import { recordsOf, showRecordOf } from "./bdJson";
import {
  isWork,
  parseExportedIssue,
  parseIssue,
  parseIssueDependencies,
  parseIssueDetail,
  parseIssueEvents,
  parseIssues,
  type ExportedIssue,
  type Issue,
  type IssueDependency,
  type IssueDetail,
  type IssueEvent,
  type IssueStatus,
} from "./issue";
import { queryIssues, withNoLimit } from "./issueList";
import { outputError, runBdChecked, runBdJson, trimmedId, type BdOutcome } from "./runBd";

export type EpicStatus = {
  epic: Issue;
  totalChildren: number;
  closedChildren: number;
  /** 저장 상태가 진행 중인 직접 하위 이슈 수입니다. 작업 상태(workState)와 달리 의존 관계에 막힌 이슈와 하위 에픽도 셉니다. */
  inProgressChildren: number;
};

export type DecisionRecord = {
  decision: Issue;
  /** `bd supersede`로 이 decision을 대체한 이슈입니다. 대체되지 않았으면 null입니다. */
  supersededBy: string | null;
};

const READY_ARGS = withNoLimit(["ready"], ["--json"]);

const BLOCKED_ARGS = ["blocked", "--json"];

/**
 * 이슈 목록을 읽고 작업 상태(workState)를 정하는 값을 채워 돌려줍니다. 이 값이 빠지면 막힌 이슈가 열린 이슈로 보입니다.
 * 목록과 함께 bd blocked와 bd ready를 실행하며, 조회가 하나라도 실패하면 오류를 돌려줍니다.
 */
export function listIssues(cwd: string, statuses: IssueStatus[]): Promise<BdOutcome<Issue[]>> {
  return withWorkSignals(cwd, queryIssues(cwd, listArgs(statuses)));
}

export type DependencyGraph = {
  issues: Issue[];
  dependencies: IssueDependency[];
};

/** 모든 상태의 이슈와 그 이슈들의 의존 관계(모든 유형)를 bd list 한 번으로 읽고, 작업 상태를 정하는 값을 채웁니다. */
export async function dependencyGraph(cwd: string): Promise<BdOutcome<DependencyGraph>> {
  const result = await runBdJson(cwd, [...listArgs([]), "--include-gates"]);
  if (!result.ok) return result;
  const issues = await withWorkSignals(
    cwd,
    Promise.resolve({ ok: true, value: parseIssues(result.value) }),
  );
  if (!issues.ok) return issues;
  return {
    ok: true,
    value: {
      issues: issues.value,
      dependencies: parseIssueDependencies(result.value),
    },
  };
}

/** 이슈의 변경 이벤트를 읽습니다. 댓글은 이벤트로 남지 않으므로 showIssue의 comments로 읽습니다. */
export async function issueEvents(cwd: string, issueId: string): Promise<BdOutcome<IssueEvent[]>> {
  const id = trimmedId(issueId, "emptyIssueId");
  if (!id.ok) return id;
  // bd history는 기본 개수 제한이 없어 이 인자가 없어도 잘리지 않지만, 목록 읽기와 같은 withNoLimit으로 묶어 제한 규칙을 한곳에 둡니다.
  const result = await runBdJson(cwd, [
    ...withNoLimit(["history", "--events", "--json"]),
    "--",
    id.value,
  ]);
  return result.ok ? { ok: true, value: parseIssueEvents(result.value) } : result;
}

/**
 * 이슈마다 본문 필드와 댓글까지 담은 레코드를 닫힌 이슈와 gate까지 모두 읽습니다.
 * bd 1.3.1의 export는 help 설명과 달리 `--all` 없이도 gate를 내놓습니다.
 * `--all`이나 `--include-memories`를 주면 bd가 민감한 에이전트 정보가 담길 수 있다며 기본 출력에서 뺀 memory도 함께 나오므로, 두 옵션을 주지 않습니다.
 */
export async function exportedIssues(cwd: string): Promise<BdOutcome<ExportedIssue[]>> {
  const result = await runBdChecked(cwd, ["export"]);
  if (!result.ok) return result;
  const issues: ExportedIssue[] = [];
  // export는 JSON 배열이 아니라 레코드마다 한 줄씩 출력합니다.
  for (const line of result.value.split("\n")) {
    if (line.trim() === "") continue;
    let record: unknown;
    try {
      record = JSON.parse(line);
    } catch {
      return outputError("unparsableOutput");
    }
    const issue = parseExportedIssue(record);
    if (issue) issues.push(issue);
  }
  return { ok: true, value: issues };
}

/** 바로 작업할 수 있는 이슈를 읽습니다. decision, epic, milestone은 빼고 돌려줍니다. */
export async function readyIssues(cwd: string): Promise<BdOutcome<Issue[]>> {
  const result = await queryIssues(cwd, READY_ARGS);
  return result.ok ? { ok: true, value: result.value.filter(isWork) } : result;
}

/**
 * 목록 조회와 bd blocked, bd ready를 함께 실행해 화면이 작업 상태를 정하는 데 쓰는 값을 채웁니다.
 * 의존 관계 때문에 막힌 이슈에는 막고 있는 이슈 id(blockedBy)를, bd ready에 든 이슈에는 ready를 채웁니다.
 * 조회가 하나라도 실패하면 막힌 이슈를 열린 이슈로 잘못 보이지 않도록 오류를 돌려줍니다.
 */
export async function withWorkSignals(
  cwd: string,
  listing: Promise<BdOutcome<Issue[]>>,
): Promise<BdOutcome<Issue[]>> {
  const [listed, blocked, ready] = await Promise.all([
    listing,
    queryIssues(cwd, BLOCKED_ARGS),
    queryIssues(cwd, READY_ARGS),
  ]);
  if (!listed.ok) return listed;
  if (!blocked.ok) return blocked;
  if (!ready.ok) return ready;

  const blockers = blockersById(blocked.value);
  const readyIds = new Set(ready.value.map((issue) => issue.id));
  return {
    ok: true,
    value: listed.value.map((issue) => {
      const blockedBy = blockers.get(issue.id);
      return {
        ...issue,
        ...(blockedBy ? { blockedBy } : {}),
        ...(readyIds.has(issue.id) ? { ready: true } : {}),
      };
    }),
  };
}

export async function showIssue(cwd: string, issueId: string): Promise<BdOutcome<IssueDetail>> {
  const id = trimmedId(issueId, "emptyIssueId");
  if (!id.ok) return id;
  const result = await runBdJson(cwd, [
    "show",
    "--json",
    "--include-comments",
    "--include-dependents",
    "--",
    id.value,
  ]);
  if (!result.ok) {
    return result;
  }
  const detail = parseIssueDetail(showRecordOf(result.value));
  return detail ? { ok: true, value: detail } : outputError("missingShownIssue");
}

/**
 * epic마다 직접 하위 이슈 수와 그중 닫힌 수, 진행 중인 수를 셉니다.
 * bd epic status는 하위 이슈가 없거나 닫힌 epic을 돌려주지 않아, 모든 이슈를 한 번에 읽고 parent로 묶어 셉니다.
 */
export async function epicStatuses(cwd: string): Promise<BdOutcome<EpicStatus[]>> {
  const result = await queryIssues(cwd, listArgs([]));
  if (!result.ok) {
    return result;
  }
  const childrenByParent = groupByParent(result.value);
  return {
    ok: true,
    value: result.value
      .filter((issue) => issue.issueType === "epic")
      .map((epic) => {
        const children = childrenByParent.get(epic.id) ?? [];
        return {
          epic,
          totalChildren: children.length,
          closedChildren: children.filter((child) => child.status === "closed").length,
          inProgressChildren: children.filter((child) => child.status === "in_progress").length,
        };
      }),
  };
}

/** 모든 상태의 decision을 읽습니다. bd supersede는 대체된 쪽에 대체한 이슈를 향하는 supersedes 의존 관계를 남깁니다. */
export async function decisionRecords(cwd: string): Promise<BdOutcome<DecisionRecord[]>> {
  const result = await runBdJson(cwd, [...listArgs([]), "--type=decision"]);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    value: recordsOf(result.value).flatMap((record) => {
      const decision = parseIssue(record);
      return decision ? [{ decision, supersededBy: supersedingIssue(record) }] : [];
    }),
  };
}

/** decision 레코드의 supersedes 관계에서 이 decision을 대체한 이슈 id를 꺼냅니다. 대체되지 않았으면 null입니다. */
function supersedingIssue(record: unknown): string | null {
  const supersedes = parseIssueDependencies([record]).find(({ type }) => type === "supersedes");
  return supersedes?.dependsOnId || null;
}

function blockersById(blocked: Issue[]): Map<string, string[]> {
  return new Map(blocked.map((issue) => [issue.id, issue.blockedBy ?? []]));
}

function groupByParent(issues: Issue[]): Map<string, Issue[]> {
  const childrenByParent = new Map<string, Issue[]>();
  for (const issue of issues) {
    if (issue.parent) {
      childrenByParent.set(issue.parent, [...(childrenByParent.get(issue.parent) ?? []), issue]);
    }
  }
  return childrenByParent;
}

// 상태를 지정하지 않으면 --all로 조회합니다. --status를 비우면 bd가 기본 필터(closed 제외)를 쓰고,
// 알려진 상태를 모두 나열하면 pinned, hooked와 사용자 정의 상태가 빠집니다.
function listArgs(statuses: IssueStatus[]): string[] {
  const filter = statuses.length > 0 ? ["--status", statuses.join(",")] : ["--all"];
  return withNoLimit(["list", "--json", "--tree=false", ...filter]);
}
