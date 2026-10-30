import { isRecord, recordsOf, stringOr, timestampOr } from "./bdJson";

/** `bd list --status`가 받는 저장 상태입니다. */
export const ISSUE_STATUSES = ["open", "in_progress", "blocked", "deferred", "closed"] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];

/** bd JSON 출력에서 화면이 쓰는 필드만 골라 camelCase로 바꾼 이슈입니다. 시각은 epoch ms입니다. */
export type Issue = {
  id: string;
  title: string;
  status: string;
  priority: number | null;
  issueType: string;
  assignee: string | null;
  labels: string[];
  parent: string | null;
  dependencyCount: number;
  dependentCount: number;
  createdAt: number;
  updatedAt: number;
  /** bd update --claim이나 진행 중으로 바꿔 착수한 시각입니다. 착수하지 않고 닫은 이슈는 null입니다. */
  startedAt: number | null;
  closedAt: number | null;
  /** 보류 기한입니다. 기한이 지나면 다음 bd ready 조회 때 bd가 이슈를 다시 엽니다. 기한 없이 보류했거나 보류가 아니면 null입니다. */
  deferUntil: number | null;
  /** 마감 시각입니다. bd는 날짜만 받으면 bd를 실행한 시간대의 그날 0시로 저장합니다. 마감일이 없으면 null입니다. */
  dueAt: number | null;
  /** 의존 관계 때문에 이 이슈를 막고 있는 이슈 id입니다. bd blocked 출력에만 있어, 목록 조회가 bd blocked에 나온 이슈에만 채웁니다. */
  blockedBy?: string[];
  /** bd ready에 들어 있으면 true입니다. 목록 조회가 따로 채웁니다. */
  ready?: boolean;
  /** gate가 기다리는 대상(human, timer, gh:pr 등)입니다. bd 출력에 await_type이 있는 gate에만 채웁니다. */
  awaitType?: string;
};

/** agent가 사람에게 판단을 넘긴 이슈에 붙이는 라벨입니다. bd human 명령이 이 라벨로 이슈를 모읍니다. */
export const HUMAN_LABEL = "human";

/** bd human respond와 dismiss는 이슈를 닫기만 하고 라벨은 남기므로, 닫힌 이슈는 판단을 기다리지 않습니다. */
export function awaitsHumanDecision(issue: Pick<Issue, "status" | "labels">): boolean {
  return issue.status !== "closed" && issue.labels.includes(HUMAN_LABEL);
}

/** bd list --overdue와 같은 기준입니다. 마감 시각이 now보다 이르면, 닫힌 이슈가 아닌 한 진행 중·막힘·보류 이슈도 기한 초과입니다. */
export function isOverdue(issue: Pick<Issue, "status" | "dueAt">, now: number): boolean {
  return issue.status !== "closed" && issue.dueAt !== null && issue.dueAt < now;
}

/**
 * 직접 작업하지 않는 유형입니다. bd ready는 molecule을 빼고 이 유형도 돌려줍니다.
 * decision은 열려 있으면 유효한 결정이라는 기록이고, epic은 하위 이슈를 묶을 뿐 직접 작업하지 않습니다.
 * milestone은 bd types가 관련 이슈들의 완료를 표시하고 작업 자체는 담지 않는 유형으로 설명합니다.
 * molecule은 bd mol pour가 formula의 단계 이슈들을 하위 이슈로 묶으려고 만드는 루트 이슈이고, 작업은 단계 이슈가 담습니다.
 */
export const NON_WORK_TYPES: ReadonlySet<string> = new Set([
  "epic",
  "decision",
  "milestone",
  "molecule",
]);

/** 직접 작업하는 유형의 이슈인지 확인합니다. */
export function isWork(issue: Pick<Issue, "issueType">): boolean {
  return !NON_WORK_TYPES.has(issue.issueType);
}

/** 저장 상태와 의존 관계, human 라벨, bd ready를 합쳐 지금 이 이슈로 무엇을 할 수 있는지 나타냅니다. */
export type WorkState =
  | "in_progress"
  | "ready"
  | "blocked"
  | "awaiting_human"
  | "deferred"
  | "closed"
  | "other";

/**
 * 이슈를 작업 상태로 나눠 보이는 화면(이슈 목록, 첫 화면, 그래프, 보드)은 모두 이 판정을 씁니다.
 * blockedBy와 ready는 목록 조회(withWorkSignals)가 채운 값이어야 합니다.
 * 닫힘과 보류는 저장 상태를 따르고, 미해결 의존이 있어도 blocked로 보지 않습니다. 그 밖에 bd blocked에 나온 이슈는 저장 상태와 관계없이 blocked입니다.
 * bd ready는 human 라벨 이슈도 돌려주지만, 사람이 판단할 차례라 진행 중이나 바로 작업 가능으로 보지 않습니다.
 * 직접 작업하지 않는 유형(NON_WORK_TYPES)은 진행 중이거나 bd ready에 있어도 in_progress나 ready로 보지 않습니다.
 */
export function workState(issue: Issue): WorkState {
  if (issue.status === "closed") return "closed";
  if (issue.status === "deferred") return "deferred";
  if (issue.status === "blocked" || issue.blockedBy !== undefined) return "blocked";
  if (awaitsHumanDecision(issue)) return "awaiting_human";
  if (NON_WORK_TYPES.has(issue.issueType)) return "other";
  if (issue.status === "in_progress") return "in_progress";
  if (issue.status === "open" && issue.ready) return "ready";
  return "other";
}

/**
 * 사람이 닫아야 풀리는 열린 gate인지 bd JSON 레코드로 확인합니다. human 라벨과 관계없습니다.
 * gate는 bd gate create가 만드는 별도 이슈로, 닫힐 때까지 막고 있는 이슈를 bd ready에서 빼고 bd close도 거부하게 합니다.
 */
export function isOpenHumanGate(record: unknown): boolean {
  return (
    isRecord(record) &&
    record.issue_type === "gate" &&
    record.await_type === "human" &&
    record.status !== "closed"
  );
}

/** gate이고 사람이 닫아야 풀리는 await 유형인지 확인합니다. 닫혔는지는 따지지 않습니다. */
export function isHumanGateAwait(link: { issueType: string; awaitType?: string }): boolean {
  return link.issueType === "gate" && link.awaitType === "human";
}

/** 상세 화면의 의존 관계 한 건이 사람이 닫아야 풀리는 열린 gate인지 확인합니다. */
export function isOpenHumanGateLink(link: {
  issueType: string;
  awaitType?: string;
  status: string;
}): boolean {
  return isHumanGateAwait(link) && link.status !== "closed";
}

// bd 1.3.1의 bd gate create는 설명을 `Ad-hoc gate blocking <id>`와 `Reason: <사유>` 두 문단으로 만듭니다.
// 이 형식이 아니면 사유를 따로 적지 않은 것으로 보고 설명 전체를 사유로 보입니다.
const AD_HOC_GATE = /^Ad-hoc gate blocking \S+(?:\n\nReason: ([\s\S]*))?$/;

/** gate 설명에서 gate를 만들 때 남긴 사유를 꺼냅니다. 사유가 없으면 빈 문자열입니다. */
export function humanGateReason(description: string): string {
  const adHoc = AD_HOC_GATE.exec(description);
  return adHoc ? (adHoc[1] ?? "") : description;
}

/** 상세 화면에서 다른 이슈와의 의존 관계 한 건입니다. */
export type IssueLink = {
  id: string;
  title: string;
  status: string;
  priority: number | null;
  issueType: string;
  /** blocks, parent-child, related처럼 bd가 기록한 의존 유형입니다. */
  dependencyType: string;
  /** gate가 기다리는 대상입니다. human이면 사람이 gate를 닫아야 풀립니다. gate가 아니면 빈 문자열입니다. */
  awaitType: string;
};

export type IssueComment = {
  id: string;
  author: string;
  text: string;
  createdAt: number;
};

/** 이슈 본문의 필드와 댓글입니다. 상세 조회와 export가 같은 형태로 출력하고, bd는 값이 빈 필드를 출력하지 않으므로 없는 본문 필드는 빈 문자열로 읽습니다. */
type IssueBody = {
  description: string;
  design: string;
  acceptanceCriteria: string;
  notes: string;
  closeReason: string | null;
  comments: IssueComment[];
};

export type IssueDetail = Issue &
  IssueBody & {
    /** 이 이슈가 의존하는 이슈입니다. */
    dependencies: IssueLink[];
    /** 이 이슈에 의존하는 이슈입니다. */
    dependents: IssueLink[];
  };

export function parseIssues(value: unknown): Issue[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(parseIssue).filter((issue): issue is Issue => issue !== null);
}

export function parseIssue(value: unknown): Issue | null {
  if (!isRecord(value) || typeof value.id !== "string" || value.id.length === 0) {
    return null;
  }
  return {
    id: value.id,
    title: stringOr(value.title, ""),
    status: stringOr(value.status, ""),
    priority: typeof value.priority === "number" ? value.priority : null,
    issueType: stringOr(value.issue_type, ""),
    assignee: stringOr(value.assignee, null),
    labels: Array.isArray(value.labels)
      ? value.labels.filter((label) => typeof label === "string")
      : [],
    parent: stringOr(value.parent, null),
    dependencyCount: typeof value.dependency_count === "number" ? value.dependency_count : 0,
    dependentCount: typeof value.dependent_count === "number" ? value.dependent_count : 0,
    createdAt: timestampOr(value.created_at, 0),
    updatedAt: timestampOr(value.updated_at, 0),
    startedAt: timestampOr(value.started_at, null),
    closedAt: timestampOr(value.closed_at, null),
    deferUntil: timestampOr(value.defer_until, null),
    dueAt: timestampOr(value.due_at, null),
    ...(Array.isArray(value.blocked_by)
      ? { blockedBy: value.blocked_by.filter((id) => typeof id === "string") }
      : {}),
    ...(typeof value.await_type === "string" && value.await_type.length > 0
      ? { awaitType: value.await_type }
      : {}),
  };
}

export function parseIssueDetail(value: unknown): IssueDetail | null {
  const issue = parseIssue(value);
  if (!issue || !isRecord(value)) {
    return null;
  }
  return {
    ...issue,
    ...parseIssueBody(value),
    dependencies: recordsOf(value.dependencies).map(parseIssueLink),
    dependents: recordsOf(value.dependents).map(parseIssueLink),
  };
}

/** `bd export`가 이슈마다 내놓는 레코드입니다. gate도 담습니다. 시각은 epoch ms입니다. */
export type ExportedIssue = Issue &
  IssueBody & {
    /** 이슈를 만든 actor입니다. 기록되지 않았으면 빈 문자열입니다. */
    createdBy: string;
  };

export function parseExportedIssue(value: unknown): ExportedIssue | null {
  const issue = parseIssue(value);
  if (!issue || !isRecord(value)) {
    return null;
  }
  return {
    ...issue,
    ...parseIssueBody(value),
    createdBy: stringOr(value.created_by, ""),
  };
}

/** 상세 조회와 export가 같은 형태로 내놓는 이슈 본문과 댓글을 꺼냅니다. */
function parseIssueBody(value: Record<string, unknown>): IssueBody {
  return {
    description: stringOr(value.description, ""),
    design: stringOr(value.design, ""),
    acceptanceCriteria: stringOr(value.acceptance_criteria, ""),
    notes: stringOr(value.notes, ""),
    closeReason: stringOr(value.close_reason, null),
    comments: parseComments(value.comments),
  };
}

function parseComments(value: unknown): IssueComment[] {
  return recordsOf(value).map((comment) => ({
    id: stringOr(comment.id, ""),
    author: stringOr(comment.author, ""),
    text: stringOr(comment.text, ""),
    createdAt: timestampOr(comment.created_at, 0),
  }));
}

/** 의존 관계 한 건입니다. issueId가 dependsOnId에 의존합니다. blocks이면 dependsOnId를 먼저 끝내야 합니다. 시각은 epoch ms입니다. */
export type IssueDependency = {
  issueId: string;
  dependsOnId: string;
  type: string;
  createdAt: number;
};

/** bd list --json이 이슈마다 담는 dependencies 배열을 한 목록으로 모읍니다. */
export function parseIssueDependencies(value: unknown): IssueDependency[] {
  return recordsOf(value).flatMap((issue) =>
    recordsOf(issue.dependencies).map((dependency) => ({
      issueId: stringOr(dependency.issue_id, ""),
      dependsOnId: stringOr(dependency.depends_on_id, ""),
      type: stringOr(dependency.type, ""),
      createdAt: timestampOr(dependency.created_at, 0),
    })),
  );
}

/** 이벤트 하나에서 바뀐 필드입니다. 필드 이름은 Issue처럼 camelCase로 바꾸고, 값은 bd가 기록한 그대로 둡니다. */
export type IssueFieldChange = { field: string; before: unknown; after: unknown };

/** bd history --events가 돌려주는 이슈 변경 기록 한 건입니다. 시각은 epoch ms이고 초 단위까지만 기록됩니다. */
export type IssueEvent = {
  id: string;
  /** created, updated, claimed, status_changed, closed, reopened, dependency_added, label_added 같은 bd의 이벤트 종류입니다. */
  type: string;
  actor: string;
  createdAt: number;
  /** bd가 바뀐 필드를 JSON으로 남긴 이벤트(updated, claimed, status_changed)의 변경입니다. */
  changes: IssueFieldChange[];
  /** 관계를 더하거나 지운 이벤트의 상대 이슈입니다. bd는 지운 이벤트에 관계 유형을 남기지 않습니다. */
  dependency: { dependsOnId: string; type: string | null } | null;
  /** 라벨을 붙이거나 뗀 이벤트의 라벨입니다. */
  label: string | null;
  /** 닫는 사유처럼 위 형태로 해석하지 않은 bd의 기록입니다. */
  text: string | null;
};

const DEPENDENCY_ADDED = /^Added dependency: \S+ (\S+) (\S+)$/;
const DEPENDENCY_REMOVED = /^Removed dependency on (\S+)$/;
const LABEL_CHANGED = /^(?:Added|Removed) label: (.+)$/s;

/** 관계 문장에서 상대 이슈와 관계 유형을 꺼냅니다. 관계 문장이 아니면 null이고, 지운 문장은 bd가 유형을 남기지 않아 유형이 null입니다. */
function dependencyOf(note: string): { dependsOnId: string; type: string | null } | null {
  const added = DEPENDENCY_ADDED.exec(note);
  if (added) {
    return { dependsOnId: added[2]!, type: added[1]! };
  }
  const removed = DEPENDENCY_REMOVED.exec(note);
  return removed ? { dependsOnId: removed[1]!, type: null } : null;
}

/** 라벨 문장에서 라벨을 꺼냅니다. 라벨 문장이 아니면 null입니다. */
function labelOf(note: string): string | null {
  const changed = LABEL_CHANGED.exec(note);
  return changed ? changed[1]! : null;
}

/**
 * bd는 필드 변경 이벤트의 old_value에 바뀌기 전 이슈 전체를, new_value에 바뀐 필드만 JSON으로 남깁니다.
 * 관계와 라벨 변경은 JSON이 아니라 문장으로 남기므로(관계는 new_value, 라벨은 comment) 그 문장에서 값을 꺼냅니다.
 */
export function parseIssueEvents(value: unknown): IssueEvent[] {
  return recordsOf(value).map((record) => {
    const newValue = stringOr(record.new_value, "");
    const note = newValue || stringOr(record.comment, "");
    const after = jsonRecord(newValue);
    const changes = after
      ? fieldChanges(jsonRecord(stringOr(record.old_value, "")) ?? {}, after)
      : [];
    const dependency = dependencyOf(note);
    const label = labelOf(note);
    // 필드 변경, 관계, 라벨으로 해석한 문장은 본문으로 다시 담지 않습니다.
    const interpreted = after !== null || dependency !== null || label !== null;
    return {
      id: stringOr(record.id, ""),
      type: stringOr(record.event_type, ""),
      actor: stringOr(record.actor, ""),
      createdAt: timestampOr(record.created_at, 0),
      changes,
      dependency,
      label,
      text: interpreted || note === "" ? null : note,
    };
  });
}

function fieldChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): IssueFieldChange[] {
  return Object.entries(after).map(([key, value]) => ({
    field: key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    before: before[key] ?? null,
    after: value,
  }));
}

function jsonRecord(text: string): Record<string, unknown> | null {
  if (!text.startsWith("{")) return null;
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function parseIssueLink(value: Record<string, unknown>): IssueLink {
  return {
    id: stringOr(value.id, ""),
    title: stringOr(value.title, ""),
    status: stringOr(value.status, ""),
    priority: typeof value.priority === "number" ? value.priority : null,
    issueType: stringOr(value.issue_type, ""),
    dependencyType: stringOr(value.dependency_type, ""),
    awaitType: stringOr(value.await_type, ""),
  };
}
