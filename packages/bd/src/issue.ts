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
  /** 의존 관계 때문에 이 이슈를 막고 있는 이슈 id입니다. bd blocked 출력에만 있어, 목록 조회가 따로 채웁니다. */
  blockedBy?: string[];
  /** bd ready에 들어 있으면 true입니다. 목록 조회가 따로 채웁니다. */
  ready?: boolean;
};

/** agent가 사람에게 판단을 넘긴 이슈에 붙이는 라벨입니다. bd human 명령이 이 라벨로 이슈를 모읍니다. */
export const HUMAN_LABEL = "human";

/** bd human respond와 dismiss는 이슈를 닫기만 하고 라벨은 남기므로, 닫힌 이슈는 판단을 기다리지 않습니다. */
export function awaitsHumanDecision(issue: Pick<Issue, "status" | "labels">): boolean {
  return issue.status !== "closed" && issue.labels.includes(HUMAN_LABEL);
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
};

export type IssueComment = {
  id: string;
  author: string;
  text: string;
  createdAt: number;
};

export type IssueDetail = Issue & {
  description: string;
  design: string;
  acceptanceCriteria: string;
  notes: string;
  closeReason: string | null;
  /** 이 이슈가 의존하는 이슈입니다. */
  dependencies: IssueLink[];
  /** 이 이슈에 의존하는 이슈입니다. */
  dependents: IssueLink[];
  comments: IssueComment[];
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
    ...(Array.isArray(value.blocked_by)
      ? { blockedBy: value.blocked_by.filter((id) => typeof id === "string") }
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
    description: stringOr(value.description, ""),
    design: stringOr(value.design, ""),
    acceptanceCriteria: stringOr(value.acceptance_criteria, ""),
    notes: stringOr(value.notes, ""),
    closeReason: stringOr(value.close_reason, null),
    dependencies: recordsOf(value.dependencies).map(parseIssueLink),
    dependents: recordsOf(value.dependents).map(parseIssueLink),
    comments: recordsOf(value.comments).map((comment) => ({
      id: stringOr(comment.id, ""),
      author: stringOr(comment.author, ""),
      text: stringOr(comment.text, ""),
      createdAt: timestampOr(comment.created_at, 0),
    })),
  };
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
  /** bd가 바뀐 필드를 JSON으로 남긴 이벤트(updated, claimed, status_changed, reopened)의 변경입니다. */
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

/**
 * bd는 필드 변경 이벤트의 old_value에 바뀌기 전 이슈 전체를, new_value에 바뀐 필드만 JSON으로 남깁니다.
 * 관계와 라벨 변경은 JSON이 아니라 문장으로 남기므로(관계는 new_value, 라벨은 comment) 그 문장에서 값을 꺼냅니다.
 */
export function parseIssueEvents(value: unknown): IssueEvent[] {
  return recordsOf(value).map((record) => {
    const newValue = stringOr(record.new_value, "");
    const note = newValue || stringOr(record.comment, "");
    const added = DEPENDENCY_ADDED.exec(note);
    const removed = DEPENDENCY_REMOVED.exec(note);
    const label = LABEL_CHANGED.exec(note);
    const after = jsonRecord(newValue);
    const changes = after
      ? fieldChanges(jsonRecord(stringOr(record.old_value, "")) ?? {}, after)
      : [];
    const dependency = added
      ? { dependsOnId: added[2]!, type: added[1]! }
      : removed
        ? { dependsOnId: removed[1]!, type: null }
        : null;
    return {
      id: stringOr(record.id, ""),
      type: stringOr(record.event_type, ""),
      actor: stringOr(record.actor, ""),
      createdAt: timestampOr(record.created_at, 0),
      changes,
      dependency,
      label: label ? label[1]! : null,
      text: after || dependency || label || note === "" ? null : note,
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
  };
}

function recordsOf(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOr<T extends string | null>(value: unknown, fallback: T): string | T {
  return typeof value === "string" ? value : fallback;
}

function timestampOr<T extends number | null>(value: unknown, fallback: T): number | T {
  const ms = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(ms) ? ms : fallback;
}
