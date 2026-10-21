import type { DependencyGraph } from "@beads-desk/bd/types";

export const GRAPH_PATH = "/api/graph";

/** 의존 그래프 화면이 범위를 좁혀 그리는 데이터입니다. issues는 닫힌 이슈를 포함하고, dependencies는 목록 밖 이슈와의 관계도 담습니다. */
export type GraphData = DependencyGraph;
