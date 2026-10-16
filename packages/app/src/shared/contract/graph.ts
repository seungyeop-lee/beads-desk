import type { Issue, IssueDependency } from "@beads-desk/bd/issue";

export const GRAPH_PATH = "/api/graph";

const CLOSED_PARAM = "closed";

/**
 * 의존 그래프 페이지의 모든 탭이 그리는 데이터입니다. dependencies는 목록 밖 이슈와의 관계도 담습니다.
 * ancestorEpics는 issues의 이슈마다 parent를 따라 올라가며 만나는 에픽 id이고, 목록에서 뺀 닫힌 상위 이슈도 거쳐 정합니다.
 * 에픽에 속하지 않은 이슈는 담지 않습니다.
 */
export type GraphData = {
  issues: Issue[];
  dependencies: IssueDependency[];
  ancestorEpics: Record<string, string[]>;
};

export function graphPath(includeClosed: boolean): string {
  return includeClosed
    ? `${GRAPH_PATH}?${new URLSearchParams({ [CLOSED_PARAM]: "1" })}`
    : GRAPH_PATH;
}

export function parseIncludeClosed(params: URLSearchParams): boolean {
  return params.get(CLOSED_PARAM) === "1";
}
