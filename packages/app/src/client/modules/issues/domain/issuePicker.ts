import type { Issue } from "@beads-desk/bd/issue";

/** 이슈 찾기 입력이 한 번에 보이는 후보 수입니다. */
export const PICKER_LIMIT = 8;

export type PickerOptions = {
  /** 후보에서 뺄 이슈 id입니다. */
  exclude: ReadonlySet<string>;
  /** 후보 순서입니다. 없으면 최근에 고친 순서입니다. */
  rank?: (a: Issue, b: Issue) => number;
};

/** 검색어가 비면 닫히지 않은 이슈를, 있으면 id나 제목에 검색어가 든 이슈를 닫힌 이슈까지 고릅니다. */
export function pickerCandidates(
  issues: readonly Issue[],
  query: string,
  { exclude, rank = byRecentlyUpdated }: PickerOptions,
): Issue[] {
  const search = query.trim().toLowerCase();
  return issues
    .filter((issue) => !exclude.has(issue.id))
    .filter((issue) =>
      search === ""
        ? issue.status !== "closed"
        : issue.id.toLowerCase().includes(search) || issue.title.toLowerCase().includes(search),
    )
    .sort(rank)
    .slice(0, PICKER_LIMIT);
}

/** 상위 이슈를 찾을 때 쓰는 순서입니다. 에픽을 먼저 보입니다. */
export function epicsFirst(a: Issue, b: Issue): number {
  return Number(b.issueType === "epic") - Number(a.issueType === "epic") || byRecentlyUpdated(a, b);
}

function byRecentlyUpdated(a: Issue, b: Issue): number {
  return b.updatedAt - a.updatedAt;
}
