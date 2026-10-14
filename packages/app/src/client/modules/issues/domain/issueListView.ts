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

// id의 숫자 부분은 숫자로 비교해 x.2가 x.10보다 앞에 오게 합니다.
const ID_COLLATOR = new Intl.Collator("en", { numeric: true });

function byId(a: Issue, b: Issue): number {
  return ID_COLLATOR.compare(a.id, b.id);
}

/**
 * 정렬한 순서를 유지하면서 하위 이슈를 상위 이슈 바로 아래로 옮깁니다. 하위의 하위도 같은 방식으로 이어집니다.
 * 상위 이슈가 목록에 없는 하위 이슈는 제자리에 둡니다.
 */
export function nestUnderParents(sorted: readonly Issue[]): Issue[] {
  const ids = new Set(sorted.map((issue) => issue.id));
  const childrenByParent = new Map<string, Issue[]>();
  const roots: Issue[] = [];
  for (const issue of sorted) {
    if (issue.parent && ids.has(issue.parent)) {
      childrenByParent.set(issue.parent, [...(childrenByParent.get(issue.parent) ?? []), issue]);
    } else {
      roots.push(issue);
    }
  }

  const nested: Issue[] = [];
  const placed = new Set<string>();
  const place = (issue: Issue) => {
    if (placed.has(issue.id)) return;
    placed.add(issue.id);
    nested.push(issue);
    childrenByParent.get(issue.id)?.forEach(place);
  };
  roots.forEach(place);
  // 상위 관계가 순환하면 어느 쪽도 최상위가 아니므로, 남은 이슈를 정렬한 순서대로 붙입니다.
  sorted.forEach(place);
  return nested;
}
