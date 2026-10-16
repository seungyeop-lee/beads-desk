import type { Issue, IssueDependency } from "@beads-desk/bd/issue";

export const GRAPH_PATH = "/api/graph";

/**
 * 의존 그래프 화면이 범위를 좁혀 그리는 데이터입니다. issues는 닫힌 이슈를 포함하고, dependencies는 목록 밖 이슈와의 관계도 담습니다.
 * ancestorEpics는 issues의 이슈마다 parent를 따라 올라가며 만나는 에픽 id입니다. 에픽에 속하지 않은 이슈는 담지 않습니다.
 */
export type GraphData = {
  issues: Issue[];
  dependencies: IssueDependency[];
  ancestorEpics: Record<string, string[]>;
};
