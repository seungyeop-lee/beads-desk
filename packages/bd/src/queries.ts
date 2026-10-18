import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type BoardColumn,
  HUMAN_LABEL,
  humanGateReason,
  isBoardColumn,
  isOpenHumanGate,
  isRecord,
  NON_WORK_TYPES,
  parseIssue,
  parseIssueDependencies,
  parseIssueDetail,
  parseIssueEvents,
  parseIssues,
  recordsOf,
  showRecordOf,
  stringOr,
  type Issue,
  type IssueComment,
  type IssueDependency,
  type IssueDetail,
  type IssueEvent,
  type IssueStatus,
  workState,
} from "./issue";
import { inputError, outputError, runBdJson, trimmedId, type BdOutcome } from "./runBd";

export type EpicStatus = {
  epic: Issue;
  totalChildren: number;
  closedChildren: number;
};

export type DecisionRecord = {
  decision: Issue;
  /** `bd supersede`로 이 decision을 대체한 이슈입니다. 대체되지 않았으면 null입니다. */
  supersededBy: string | null;
};

export type HumanGate = {
  gate: Issue;
  /** bd gate create --reason으로 남긴 사유입니다. 사유가 없으면 빈 문자열입니다. */
  reason: string;
  /** 이 gate가 막고 있는 닫히지 않은 이슈입니다. */
  blocks: Issue[];
  /** 지금 gate가 막는 작업을 이전에 막았던 닫힌 gate 수입니다. */
  previousGateCount: number;
};

export type HumanDecisionIssues = {
  /** 열린 human gate입니다. 막고 있는 이슈는 찾지 않습니다. */
  gates: Issue[];
  /** human 라벨이 붙은 닫히지 않은 이슈입니다. */
  labeled: Issue[];
};

export type BoardIssue = {
  column: BoardColumn;
  issue: Issue;
};

/** bd 목록 명령의 기본 개수 제한(list 50, ready 100)에 걸려 목록이 조용히 잘리지 않도록 제한을 없앱니다. 0이 제한 없음입니다. */
const LIST_LIMIT = "0";

const READY_ARGS = ["ready", "--limit", LIST_LIMIT, "--json"];

const BLOCKED_ARGS = ["blocked", "--json"];

/** gate 목록은 --all로 닫힌 gate까지 읽어 이전 라운드를 찾습니다. */
const ALL_GATE_LIST_ARGS = [
  "list",
  "--json",
  "--tree=false",
  "--type=gate",
  "--all",
  "--limit",
  LIST_LIMIT,
];

const OPEN_LIST_ARGS = ["list", "--json", "--tree=false", "--limit", LIST_LIMIT];

export function listIssues(cwd: string, statuses: IssueStatus[]): Promise<BdOutcome<Issue[]>> {
  return queryIssues(cwd, listArgs(statuses));
}

export type DependencyGraph = {
  issues: Issue[];
  dependencies: IssueDependency[];
  /** issues의 이슈마다 parent를 따라 올라가며 만나는 에픽 id를 가까운 것부터 담습니다. 에픽에 속하지 않은 이슈는 담지 않습니다. */
  ancestorEpics: Record<string, string[]>;
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
      ancestorEpics: ancestorEpicsOf(issues.value),
    },
  };
}

function ancestorEpicsOf(issues: Issue[]): Record<string, string[]> {
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const ancestorEpics: Record<string, string[]> = {};
  for (const issue of issues) {
    const epics: string[] = [];
    const reached = new Set([issue.id]);
    let ancestor = issue.parent ? byId.get(issue.parent) : undefined;
    // 상위 관계가 순환해도 같은 이슈를 다시 따라가지 않습니다.
    while (ancestor && !reached.has(ancestor.id)) {
      reached.add(ancestor.id);
      if (ancestor.issueType === "epic") epics.push(ancestor.id);
      ancestor = ancestor.parent ? byId.get(ancestor.parent) : undefined;
    }
    if (epics.length > 0) ancestorEpics[issue.id] = epics;
  }
  return ancestorEpics;
}

/** 이슈의 변경 이벤트를 읽습니다. 댓글은 이벤트로 남지 않으므로 showIssue의 comments로 읽습니다. */
export async function issueEvents(cwd: string, issueId: string): Promise<BdOutcome<IssueEvent[]>> {
  const id = trimmedId(issueId, "emptyIssueId");
  if (!id.ok) return id;
  const result = await runBdJson(cwd, [
    "history",
    "--events",
    "--json",
    "--limit",
    "0",
    "--",
    id.value,
  ]);
  return result.ok ? { ok: true, value: parseIssueEvents(result.value) } : result;
}

/**
 * 설명에 text가 든(대소문자 무시) 이슈의 id를 상태와 관계없이 읽습니다.
 * 목록 응답에 설명을 담으면 응답이 몇 배로 커지므로 설명 검색은 bd에 맡깁니다.
 * bd query의 description 조건은 한글 검색어를 찾지 못해 bd list --desc-contains를 씁니다.
 */
export async function issueIdsByDescription(
  cwd: string,
  text: string,
): Promise<BdOutcome<string[]>> {
  const search = text.trim();
  if (search.length === 0) {
    return inputError("emptyDescriptionSearch");
  }
  // --brief는 출력에서 설명 같은 본문을 빼지만 --desc-contains는 설명으로 거릅니다.
  // 검색어가 -로 시작해도 옵션으로 해석되지 않도록 = 로 붙여 넘깁니다.
  const result = await queryIssues(cwd, [
    "list",
    "--json",
    "--tree=false",
    "--all",
    "--brief",
    "--limit",
    LIST_LIMIT,
    `--desc-contains=${search}`,
  ]);
  return result.ok ? { ok: true, value: result.value.map((issue) => issue.id) } : result;
}

/** 바로 작업할 수 있는 이슈를 읽습니다. decision과 epic은 빼고 돌려줍니다. */
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

/**
 * 이슈 목록에서 epic 아래의 모든 후손 이슈(하위 이슈와 그 하위 이슈들)를 parent를 따라 모읍니다.
 * bd children은 직접 하위 이슈만 돌려주므로, 모든 이슈를 한 번에 읽은 목록을 넘깁니다.
 */
export function epicDescendants(issues: Issue[], epicId: string): Issue[] {
  const childrenByParent = groupByParent(issues);
  const descendants: Issue[] = [];
  const reached = new Set([epicId]);
  const pending = [epicId];
  while (pending.length > 0) {
    for (const child of childrenByParent.get(pending.shift()!) ?? []) {
      // 상위 관계가 순환해도 같은 이슈를 두 번 담지 않습니다.
      if (reached.has(child.id)) continue;
      reached.add(child.id);
      descendants.push(child);
      pending.push(child.id);
    }
  }
  return descendants;
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
 * epic마다 직접 하위 이슈 수와 닫힌 하위 이슈 수를 셉니다.
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

/** gate 목록(--all이므로 닫힌 gate 포함)과 열린 이슈, 그 이슈들이 남긴 blocks 간선입니다. */
type GateBlockers = {
  gateRecords: Record<string, unknown>[];
  openIssues: Issue[];
  blockers: IssueDependency[];
};

/** gate 목록과 열린 이슈를 함께 읽어, gate가 막고 있는 이슈를 찾는 데 필요한 값을 모읍니다. bd list는 --all을 주어도 gate를 돌려주지 않아 gate는 따로 읽습니다. */
async function readGateBlockers(cwd: string): Promise<BdOutcome<GateBlockers>> {
  const [gates, open] = await Promise.all([
    runBdJson(cwd, ALL_GATE_LIST_ARGS),
    runBdJson(cwd, OPEN_LIST_ARGS),
  ]);
  if (!gates.ok) return gates;
  if (!open.ok) return open;
  return {
    ok: true,
    value: {
      gateRecords: recordsOf(gates.value),
      openIssues: parseIssues(open.value),
      blockers: parseIssueDependencies(open.value).filter(({ type }) => type === "blocks"),
    },
  };
}

/** blockers 간선에서 gate가 막고 있는 이슈 id를 모읍니다. */
function blockedIdsOf(gateId: string, blockers: IssueDependency[]): string[] {
  return blockers.filter(({ dependsOnId }) => dependsOnId === gateId).map(({ issueId }) => issueId);
}

/**
 * 열린 human gate와 각 gate가 막고 있는 닫히지 않은 이슈를 읽습니다.
 * gate 출력에는 막고 있는 이슈 id가 없으므로, 닫히지 않은 이슈의 blocks 의존 관계에서 찾습니다.
 */
export async function humanGates(cwd: string): Promise<BdOutcome<HumanGate[]>> {
  const read = await readGateBlockers(cwd);
  if (!read.ok) return read;
  const { gateRecords, openIssues, blockers } = read.value;
  const openById = new Map(openIssues.map((issue) => [issue.id, issue]));
  return {
    ok: true,
    value: gateRecords.filter(isOpenHumanGate).flatMap((record) => {
      const gate = parseIssue(record);
      if (!gate) return [];
      const blockedIds = blockedIdsOf(gate.id, blockers);
      return [
        {
          gate,
          reason: humanGateReason(stringOr(record.description, "")),
          blocks: blockedIds.flatMap((id) => openById.get(id) ?? []),
          previousGateCount: previousGateRoundsOf(blockedIds, blockers, gateRecords).length,
        },
      ];
    }),
  };
}

export type PreviousGateRound = {
  gate: Issue;
  /** gate를 닫을 때 bd가 남긴 사유입니다. */
  closeReason: string | null;
  comments: IssueComment[];
};

/**
 * 지금 human gate와 같은 작업을 막았던 닫힌 gate(이전 라운드)를 오래된 라운드부터 읽어 닫은 사유와 코멘트를 돌려줍니다.
 * 라운드 순서는 작업이 gate에 막힌 blocks 간선의 created_at으로 정하고, 라운드마다 bd show로 코멘트를 읽습니다.
 */
export async function previousGateRounds(
  cwd: string,
  gateId: string,
): Promise<BdOutcome<PreviousGateRound[]>> {
  const id = trimmedId(gateId, "emptyGateId");
  if (!id.ok) return id;
  const read = await readGateBlockers(cwd);
  if (!read.ok) return read;
  const { gateRecords, blockers } = read.value;
  const previous = previousGateRoundsOf(blockedIdsOf(id.value, blockers), blockers, gateRecords);
  const details = await Promise.all(previous.map((round) => showIssue(cwd, round.gate.id)));
  const rounds: PreviousGateRound[] = [];
  for (const [index, detail] of details.entries()) {
    if (!detail.ok) return detail;
    rounds.push({
      gate: previous[index]!.gate,
      closeReason: detail.value.closeReason,
      comments: detail.value.comments,
    });
  }
  return { ok: true, value: rounds };
}

/** gate가 닫혔는지 bd JSON 레코드로 확인합니다. await 유형은 따지지 않습니다. */
function isClosedGate(record: Record<string, unknown>): boolean {
  return record.issue_type === "gate" && record.status === "closed";
}

/**
 * 지금 gate가 막는 작업을 이전에 막았던 닫힌 gate를 라운드가 시작된 순으로 돌려줍니다.
 * gate가 여러 작업을 막으면 그 작업 전부를 막았던 닫힌 gate만 이전 라운드로 잇고, 막는 작업이 없으면 이전 라운드도 없습니다.
 */
function previousGateRoundsOf(
  blockedIds: string[],
  blockers: IssueDependency[],
  gateRecords: Record<string, unknown>[],
): { gate: Issue; roundStartedAt: number }[] {
  if (blockedIds.length === 0) return [];
  const blocked = new Set(blockedIds);
  return gateRecords
    .filter(isClosedGate)
    .flatMap((record) => {
      const gate = parseIssue(record);
      if (!gate) return [];
      const roundEdges = blockers.filter(
        ({ dependsOnId, issueId }) => dependsOnId === gate.id && blocked.has(issueId),
      );
      return roundEdges.length === blocked.size
        ? [{ gate, roundStartedAt: Math.min(...roundEdges.map(({ createdAt }) => createdAt)) }]
        : [];
    })
    .sort(
      (left, right) =>
        left.roundStartedAt - right.roundStartedAt || left.gate.id.localeCompare(right.gate.id),
    );
}

/**
 * 사람 판단을 기다리는 일을 셀 때 필요한 이슈만 읽습니다. 열린 human gate와, human 라벨이 붙은 닫히지 않은 이슈입니다.
 * humanGates와 달리 전체 목록을 읽지 않고 gate가 막고 있는 이슈도 찾지 않아, 개수만 필요한 곳의 bd 실행 비용을 줄입니다.
 */
export async function humanDecisionIssues(cwd: string): Promise<BdOutcome<HumanDecisionIssues>> {
  const [gates, labeled] = await Promise.all([
    runBdJson(cwd, ["list", "--json", "--tree=false", "--type=gate", "--limit", LIST_LIMIT]),
    queryIssues(cwd, [
      "list",
      "--json",
      "--tree=false",
      "--label",
      HUMAN_LABEL,
      "--limit",
      LIST_LIMIT,
    ]),
  ]);
  if (!gates.ok) return gates;
  if (!labeled.ok) return labeled;
  return {
    ok: true,
    value: {
      gates: recordsOf(gates.value)
        .filter(isOpenHumanGate)
        .flatMap((record) => parseIssue(record) ?? []),
      labeled: labeled.value,
    },
  };
}

/**
 * days일 넘게 갱신되지 않은 이슈를 읽습니다. decision과 epic은 뺍니다.
 * decision은 열려 있는 동안 유효한 기록이고, epic은 하위 이슈가 진행돼도 갱신 시각이 바뀌지 않아 방치된 것으로 잘못 보이기 때문입니다.
 */
export async function staleIssues(cwd: string, days: number): Promise<BdOutcome<Issue[]>> {
  if (!Number.isInteger(days) || days < 1) {
    return inputError("invalidStaleDays");
  }
  const result = await queryIssues(cwd, [
    "stale",
    "--json",
    "--days",
    String(days),
    "--limit",
    LIST_LIMIT,
  ]);
  return result.ok ? { ok: true, value: result.value.filter(isWork) } : result;
}

export type OrphanIssue = {
  id: string;
  title: string;
  status: string;
  latestCommit: string;
  latestCommitMessage: string;
};

/**
 * 커밋 메시지에 id가 나오지만 아직 닫히지 않은 이슈를 읽습니다. bd는 workspace의 git 커밋 기록을 읽습니다.
 * git 저장소가 아니어도 bd는 실패하지 않고 결과가 없을 때와 같은 null을 출력해, 두 경우를 구별할 수 없습니다.
 */
export async function orphanIssues(cwd: string): Promise<BdOutcome<OrphanIssue[]>> {
  const result = await runBdJson(cwd, ["orphans", "--json"]);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    value: recordsOf(result.value).map((orphan) => ({
      id: stringOr(orphan.issue_id, ""),
      title: stringOr(orphan.title, ""),
      status: stringOr(orphan.status, ""),
      latestCommit: stringOr(orphan.latest_commit, ""),
      latestCommitMessage: stringOr(orphan.latest_commit_message, ""),
    })),
  };
}

export type LintFinding = {
  id: string;
  title: string;
  issueType: string;
  /** 빠진 섹션의 제목입니다(예: `## Acceptance Criteria`). */
  missing: string[];
};

/** 이슈 유형마다 bd가 권하는 섹션이 빠진 열린 이슈를 읽습니다. */
export async function lintFindings(cwd: string): Promise<BdOutcome<LintFinding[]>> {
  const result = await runBdJson(cwd, ["lint", "--json"]);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    value: recordsOf(isRecord(result.value) ? result.value.results : null).map((finding) => ({
      id: stringOr(finding.id, ""),
      title: stringOr(finding.title, ""),
      issueType: stringOr(finding.type, ""),
      missing: Array.isArray(finding.missing)
        ? finding.missing.filter((section) => typeof section === "string")
        : [],
    })),
  };
}

export type IssueRef = { id: string; title: string };

/** 제목과 설명이 비슷한 닫히지 않은 이슈 쌍을 읽습니다. ai 방식은 API key가 필요해 mechanical 방식만 씁니다. */
export async function duplicateCandidates(cwd: string): Promise<BdOutcome<[IssueRef, IssueRef][]>> {
  const result = await runBdJson(cwd, [
    "find-duplicates",
    "--json",
    "--method",
    "mechanical",
    "--limit",
    LIST_LIMIT,
  ]);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    value: recordsOf(isRecord(result.value) ? result.value.pairs : null).map((pair) => [
      { id: stringOr(pair.issue_a_id, ""), title: stringOr(pair.issue_a_title, "") },
      { id: stringOr(pair.issue_b_id, ""), title: stringOr(pair.issue_b_title, "") },
    ]),
  };
}

/** decision 레코드의 supersedes 관계에서 이 decision을 대체한 이슈 id를 꺼냅니다. 대체되지 않았으면 null입니다. */
function supersedingIssue(record: unknown): string | null {
  const supersedes = parseIssueDependencies([record]).find(({ type }) => type === "supersedes");
  return supersedes?.dependsOnId || null;
}

/**
 * 모든 이슈를 한 번에 읽어 작업 상태(workState)로 열을 정합니다. 열이 없는 작업 상태(보류, 판단 기다림, other)의 이슈는 넣지 않습니다.
 * decision과 epic은 작업 상태와 관계없이 보드에 넣지 않습니다.
 * 조회가 하나라도 실패하면 열을 잘못 나누게 되므로 오류를 돌려줍니다.
 */
export async function boardIssues(cwd: string): Promise<BdOutcome<BoardIssue[]>> {
  const result = await withWorkSignals(cwd, queryIssues(cwd, listArgs([])));
  if (!result.ok) return result;
  return {
    ok: true,
    value: result.value.filter(isWork).flatMap((issue): BoardIssue[] => {
      const state = workState(issue);
      return isBoardColumn(state) ? [{ column: state, issue }] : [];
    }),
  };
}

function blockersById(blocked: Issue[]): Map<string, string[]> {
  return new Map(blocked.map((issue) => [issue.id, issue.blockedBy ?? []]));
}

function isWork(issue: Issue): boolean {
  return !NON_WORK_TYPES.has(issue.issueType);
}

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

// 상태를 지정하지 않으면 --all로 조회합니다. --status를 비우면 bd가 기본 필터(closed 제외)를 쓰고,
// 알려진 상태를 모두 나열하면 pinned, hooked와 사용자 정의 상태가 빠집니다.
function groupByParent(issues: Issue[]): Map<string, Issue[]> {
  const childrenByParent = new Map<string, Issue[]>();
  for (const issue of issues) {
    if (issue.parent) {
      childrenByParent.set(issue.parent, [...(childrenByParent.get(issue.parent) ?? []), issue]);
    }
  }
  return childrenByParent;
}

function listArgs(statuses: IssueStatus[]): string[] {
  const filter = statuses.length > 0 ? ["--status", statuses.join(",")] : ["--all"];
  return ["list", "--json", "--tree=false", ...filter, "--limit", LIST_LIMIT];
}

async function queryIssues(cwd: string, args: string[]): Promise<BdOutcome<Issue[]>> {
  const result = await runBdJson(cwd, args);
  return result.ok ? { ok: true, value: parseIssues(result.value) } : result;
}
