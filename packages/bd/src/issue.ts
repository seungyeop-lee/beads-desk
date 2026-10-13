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
  };
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
