import type { Issue } from "@beads-desk/bd/issue";
import {
  byPriorityThenCreated,
  issueTree,
  type IssueTreeRow,
} from "@/client/modules/issues/domain/issueListView";

/** from이 to의 상위 이슈입니다. */
export type HierarchyEdge = { from: string; to: string };

export type IssueHierarchy = {
  /** 최상위 이슈마다 그 아래 후손을 바로 뒤에 이어 둔 순서입니다. 하위 이슈가 없는 최상위 이슈는 넣지 않습니다. */
  rows: IssueTreeRow[];
  edges: HierarchyEdge[];
  /** 주어진 이슈 가운데 상하위 관계가 없어 그리지 않는 이슈의 수입니다. */
  unrelated: number;
};

/**
 * 주어진 이슈 사이의 parent-child 관계로 계층을 만듭니다. 상위 이슈가 목록에 없으면 최상위로 봅니다.
 * 상위 관계가 순환하면 이슈 목록 화면처럼 앞선 이슈를 최상위에 두고, 그 이슈로 되돌아오는 관계는 버립니다.
 */
export function issueHierarchy(issues: Issue[]): IssueHierarchy {
  const rows = issueTree([...issues].sort(byPriorityThenCreated)).filter(
    (row) => row.depth > 0 || row.childCount > 0,
  );
  // issueTree는 하위 이슈를 자기 parent 아래에만 놓으므로, 깊이가 있는 행의 parent가 곧 그려진 상위 이슈입니다.
  const edges = rows
    .filter((row) => row.depth > 0)
    .map((row) => ({ from: row.issue.parent!, to: row.issue.id }));
  return { rows, edges, unrelated: issues.length - rows.length };
}
