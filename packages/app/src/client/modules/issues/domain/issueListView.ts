import { ISSUE_STATUSES, type Issue } from "@beads-desk/bd/issue";

/** 서버에서 받은 목록을 화면에서 더 좁히는 조건입니다. */
export type IssueListRefinement = {
  /** 비어 있으면 모든 유형을 보입니다. */
  types: string[];
  search: string;
};

/** 유형과 검색어(id나 제목, 대소문자 무시)로 거릅니다. 순서는 바꾸지 않습니다. */
export function refineIssues(issues: Issue[], refinement: IssueListRefinement): Issue[] {
  const search = refinement.search.trim().toLowerCase();
  return issues.filter(
    (issue) =>
      (refinement.types.length === 0 || refinement.types.includes(issue.issueType)) &&
      (search === "" ||
        issue.id.toLowerCase().includes(search) ||
        issue.title.toLowerCase().includes(search)),
  );
}

/** 상태별로 묶어 open → in_progress → blocked → deferred → closed 순으로 보이고, closed는 최근에 닫은 것부터 보입니다. */
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
