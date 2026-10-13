import type { IssueStatus } from "@beads-desk/bd/issue";

export const STATUS_LABELS: Record<IssueStatus, string> = {
  open: "열림",
  in_progress: "진행 중",
  blocked: "막힘",
  deferred: "보류",
  closed: "닫힘",
};

export const STATUS_BADGES: Record<IssueStatus, string> = {
  open: "badge-outline",
  in_progress: "badge-info",
  blocked: "badge-error",
  deferred: "badge-warning",
  closed: "badge-success badge-soft",
};

export const READY_LABEL = "바로 작업 가능";

/** bd의 기본 이슈 유형입니다. 설정으로 추가한 유형은 원래 이름 그대로 보입니다. */
export const TYPE_LABELS: Record<string, string> = {
  bug: "버그",
  feature: "기능",
  task: "작업",
  epic: "에픽",
  chore: "잡무",
  decision: "결정",
  spike: "스파이크",
  story: "스토리",
  milestone: "마일스톤",
};

const PRIORITY_LABELS = ["긴급", "높음", "보통", "낮음", "백로그"];

export function priorityLabel(priority: number): string {
  return PRIORITY_LABELS[priority] ?? `P${priority}`;
}
