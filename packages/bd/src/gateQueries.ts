import { recordsOf, stringOr } from "./bdJson";
import {
  HUMAN_LABEL,
  humanGateReason,
  isOpenHumanGate,
  parseIssue,
  parseIssueDependencies,
  parseIssues,
  type Issue,
  type IssueComment,
  type IssueDependency,
} from "./issue";
import { queryIssues, withNoLimit } from "./issueList";
import { showIssue } from "./issueQueries";
import { runBdJson, trimmedId, type BdOutcome } from "./runBd";

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

export type PreviousGateRound = {
  gate: Issue;
  /** gate를 닫을 때 bd가 남긴 사유입니다. */
  closeReason: string | null;
  comments: IssueComment[];
};

/** gate 목록은 --all로 닫힌 gate까지 읽어 이전 라운드를 찾습니다. */
const ALL_GATE_LIST_ARGS = withNoLimit(["list", "--json", "--tree=false", "--type=gate", "--all"]);

/** 열린 gate 목록입니다. bd list는 --type=gate를 주어야 gate를 돌려줍니다. */
const OPEN_GATE_LIST_ARGS = withNoLimit(["list", "--json", "--tree=false", "--type=gate"]);

const OPEN_LIST_ARGS = withNoLimit(["list", "--json", "--tree=false"]);

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
    runBdJson(cwd, OPEN_GATE_LIST_ARGS),
    queryIssues(cwd, withNoLimit(["list", "--json", "--tree=false", "--label", HUMAN_LABEL])),
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
 * human gate와 timer, gh:run, gh:pr gate를 가리지 않고 닫히지 않은 gate를 모두 읽습니다.
 * bd list는 gate를 돌려주지 않으므로, 이슈가 gate에 막혔을 때 gate 제목은 이 목록에서 찾습니다.
 */
export async function openGates(cwd: string): Promise<BdOutcome<Issue[]>> {
  const result = await queryIssues(cwd, OPEN_GATE_LIST_ARGS);
  return result.ok
    ? { ok: true, value: result.value.filter((gate) => gate.status !== "closed") }
    : result;
}
