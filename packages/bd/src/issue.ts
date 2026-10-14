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
  closedAt: number | null;
  /** 의존 관계 때문에 이 이슈를 막고 있는 이슈 id입니다. bd blocked 출력에만 있어, 목록 조회가 따로 채웁니다. */
  blockedBy?: string[];
  /** bd ready에 들어 있으면 true입니다. 목록 조회가 따로 채웁니다. */
  ready?: boolean;
};

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
    closedAt: timestampOr(value.closed_at, null),
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
