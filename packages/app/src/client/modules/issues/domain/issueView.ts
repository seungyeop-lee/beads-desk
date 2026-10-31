import type { WorkState } from "./workState";

/** 병목 후보를 보이는 보기 탭입니다. 작업 상태가 아니라서, 같은 이슈가 이 탭과 작업 상태 탭에 함께 나올 수 있습니다. */
export const BOTTLENECK_VIEW = "bottleneck";

/** 이슈 목록의 보기 탭 하나가 보이는 목록입니다. 작업 상태 하나이거나 병목 후보입니다. */
export type IssueView = WorkState | typeof BOTTLENECK_VIEW;

/** 이슈 목록의 보기 탭을 보이는 순서입니다. 작업 상태 탭 뒤에 병목 탭을 둡니다. 판단 기다림과 그 밖의 이슈는 전체 보기에서만 보입니다. */
export const ISSUE_VIEWS: readonly IssueView[] = [
  "in_progress",
  "ready",
  "blocked",
  "deferred",
  "closed",
  BOTTLENECK_VIEW,
];

/** 주소의 view 값을 보기 탭으로 읽습니다. 없거나 알 수 없는 값이면 전체 보기인 null입니다. */
export function parseIssueView(value: string | null): IssueView | null {
  return ISSUE_VIEWS.find((view) => view === value) ?? null;
}
