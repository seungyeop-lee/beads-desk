import { ISSUE_STATUSES, type Issue } from "@beads-desk/bd/issue";

/** 서버에서 받은 목록을 화면에서 더 좁히는 조건입니다. */
export type IssueListRefinement = {
  /** 비어 있으면 모든 유형을 보입니다. */
  types: readonly string[];
  search: string;
  /** 설명에 search가 든 이슈의 id입니다. 목록 데이터에 설명이 없어 서버가 따로 찾아 줍니다. */
  descriptionMatches?: ReadonlySet<string>;
};

/** 유형과 검색어(id나 제목, 대소문자 무시) 또는 설명 검색 결과로 거릅니다. 순서는 바꾸지 않습니다. */
export function refineIssues(issues: Issue[], refinement: IssueListRefinement): Issue[] {
  const search = refinement.search.trim().toLowerCase();
  return issues.filter(
    (issue) =>
      (refinement.types.length === 0 || refinement.types.includes(issue.issueType)) &&
      (search === "" ||
        issue.id.toLowerCase().includes(search) ||
        issue.title.toLowerCase().includes(search) ||
        (refinement.descriptionMatches?.has(issue.id) ?? false)),
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
export function byPriority(a: Issue, b: Issue): number {
  return (a.priority ?? 2) - (b.priority ?? 2);
}

export function byPriorityThenCreated(a: Issue, b: Issue): number {
  return byPriority(a, b) || a.createdAt - b.createdAt || byId(a, b);
}

export function byClosedDesc(a: Issue, b: Issue): number {
  return (b.closedAt ?? 0) - (a.closedAt ?? 0) || byId(a, b);
}

// id의 숫자 부분은 숫자로 비교해 x.2가 x.10보다 앞에 오게 합니다.
const ID_COLLATOR = new Intl.Collator("en", { numeric: true });

export function byId(a: Issue, b: Issue): number {
  return ID_COLLATOR.compare(a.id, b.id);
}

/**
 * 정렬한 순서를 유지하면서 하위 이슈를 상위 이슈 바로 아래로 옮깁니다. 하위의 하위도 같은 방식으로 이어집니다.
 * 상위 이슈가 목록에 없는 하위 이슈는 제자리에 둡니다.
 */
export function nestUnderParents(sorted: readonly Issue[]): Issue[] {
  return issueTree(sorted).map((row) => row.issue);
}

export type IssueTreeRow = {
  issue: Issue;
  /** 목록 안의 상위 이슈를 몇 단계 거쳐 내려왔는지입니다. 상위가 목록에 없으면 0입니다. */
  depth: number;
  /** 이 행 바로 아래에 놓인 하위 행의 개수입니다. */
  childCount: number;
};

/** nestUnderParents와 같은 순서로 놓고, 행마다 깊이와 바로 아래 하위 행의 개수를 붙입니다. */
export function issueTree(sorted: readonly Issue[]): IssueTreeRow[] {
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

  const rows: IssueTreeRow[] = [];
  const placed = new Set<string>();
  const place = (issue: Issue, depth: number) => {
    placed.add(issue.id);
    const row = { issue, depth, childCount: 0 };
    rows.push(row);
    for (const child of childrenByParent.get(issue.id) ?? []) {
      if (placed.has(child.id)) continue;
      row.childCount += 1;
      place(child, depth + 1);
    }
  };
  // 상위 관계가 순환하면 어느 쪽도 최상위가 아니므로, 남은 이슈를 정렬한 순서대로 붙입니다.
  for (const issue of [...roots, ...sorted]) {
    if (!placed.has(issue.id)) place(issue, 0);
  }
  return rows;
}

/** expanded에 없는 행은 접힌 것으로 보고, 그 아래 후손 행을 모두 뺍니다. */
export function visibleTreeRows(
  rows: readonly IssueTreeRow[],
  expanded: ReadonlySet<string>,
): IssueTreeRow[] {
  const visible: IssueTreeRow[] = [];
  let collapsedDepth = Infinity;
  for (const row of rows) {
    if (row.depth > collapsedDepth) continue;
    collapsedDepth = row.childCount > 0 && !expanded.has(row.issue.id) ? row.depth : Infinity;
    visible.push(row);
  }
  return visible;
}
