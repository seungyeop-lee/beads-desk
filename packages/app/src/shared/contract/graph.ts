import type { Issue, IssueDependency } from "@beads-desk/bd/issue";

export const GRAPH_PATH = "/api/graph";

const CLOSED_PARAM = "closed";

/** 의존 그래프 페이지의 모든 탭이 그리는 데이터입니다. dependencies는 목록 밖 이슈와의 관계도 담습니다. */
export type GraphData = { issues: Issue[]; dependencies: IssueDependency[] };

export function graphPath(includeClosed: boolean): string {
  return includeClosed
    ? `${GRAPH_PATH}?${new URLSearchParams({ [CLOSED_PARAM]: "1" })}`
    : GRAPH_PATH;
}

export function parseIncludeClosed(params: URLSearchParams): boolean {
  return params.get(CLOSED_PARAM) === "1";
}
