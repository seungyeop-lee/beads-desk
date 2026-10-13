import { ISSUE_STATUSES, type Issue, type IssueStatus } from "@beads-desk/bd/issue";
import type { IssueListFilter } from "@/shared/contract/issueList";

/** 서버에서 받은 목록을 화면에서 더 좁히는 조건입니다. */
export type IssueListRefinement = {
  /** 비어 있으면 모든 유형을 보입니다. */
  types: string[];
  search: string;
};

/** 상태 선택을 바꿉니다. ready는 다른 상태와 함께 고를 수 없어, 고르면 다른 선택을 대신합니다. */
export function toggleStatusFilter(
  filter: IssueListFilter,
  choice: IssueStatus | "ready",
): IssueListFilter {
  if (choice === "ready") {
    return filter.kind === "ready" ? { kind: "status", statuses: [] } : { kind: "ready" };
  }
  const statuses = filter.kind === "ready" ? [] : filter.statuses;
  return {
    kind: "status",
    statuses: statuses.includes(choice)
      ? statuses.filter((status) => status !== choice)
      : [...statuses, choice],
  };
}

/**
 * 유형과 검색어로 거른 뒤 화면 순서로 정렬합니다.
 * 상태별로 묶어 open → in_progress → blocked → deferred → closed 순으로 보이고, closed는 최근에 닫은 것부터 보입니다.
 * ready 목록은 상태로 묶지 않습니다.
 */
export function visibleIssues(
  issues: Issue[],
  filter: IssueListFilter,
  refinement: IssueListRefinement,
): Issue[] {
  const search = refinement.search.trim().toLowerCase();
  const matched = issues.filter(
    (issue) =>
      (refinement.types.length === 0 || refinement.types.includes(issue.issueType)) &&
      (search === "" ||
        issue.id.toLowerCase().includes(search) ||
        issue.title.toLowerCase().includes(search)),
  );
  return matched.sort(filter.kind === "ready" ? byPriorityThenCreated : byStatusGroup);
}

export function byStatusGroup(a: Issue, b: Issue): number {
  const rank = statusRank(a.status) - statusRank(b.status);
  if (rank !== 0) return rank;
  return a.status === "closed" ? byClosedDesc(a, b) : byPriorityThenCreated(a, b);
}

function statusRank(status: string): number {
  const index = (ISSUE_STATUSES as readonly string[]).indexOf(status);
  return index === -1 ? ISSUE_STATUSES.length : index;
}

// bd에서 우선순위를 지정하지 않은 이슈는 기본값인 2(보통)로 취급합니다.
export function byPriorityThenCreated(a: Issue, b: Issue): number {
  return (a.priority ?? 2) - (b.priority ?? 2) || a.createdAt - b.createdAt || byId(a, b);
}

export function byClosedDesc(a: Issue, b: Issue): number {
  return (b.closedAt ?? 0) - (a.closedAt ?? 0) || byId(a, b);
}

function byId(a: Issue, b: Issue): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
