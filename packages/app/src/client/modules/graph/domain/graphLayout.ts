import type { Issue } from "@beads-desk/bd/issue";
import type { AuxiliaryEdge } from "./centerGraph";
import type { OrderEdge } from "./executionOrder";

export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 76;
/** 에픽 계획 보기의 노드는 에픽 밖 표시와 대기 수를 담는 줄을 하나 더 둡니다. */
export const PLAN_NODE_HEIGHT = 96;

export type Point = { x: number; y: number };

export type CardSections = { gates: Issue[]; related: Issue[] };

export type PlacedIssue = {
  issue: Issue;
  x: number;
  y: number;
  height: number;
  sections?: CardSections;
};

/** points는 출발 노드의 변에서 도착 노드의 변까지 직각으로 꺾이는 점입니다. 첫 점과 마지막 점은 노드 변 위에 있습니다. */
export type PlacedEdge = OrderEdge & { points: Point[] };
/** from과 to는 원래 관계의 이슈 id이고, 경로는 두 이슈를 표시하는 카드(nodeOf)를 잇습니다. */
export type PlacedAuxiliaryEdge = AuxiliaryEdge & { points: Point[] };

/**
 * 화면 좌표와 실제 높이가 정해진 노드와, 노드를 피해 지나는 간선입니다.
 * edges는 blocks 간선이고 auxiliary는 관련·발견 간선입니다. columns는 열마다 왼쪽 끝의 x 좌표입니다.
 * nodeOf는 각 이슈가 표시되는 노드를 가리킵니다. 섹션 안의 이슈 id로 찾으면 그 섹션을 담은 노드입니다.
 */
export type GraphLayout = {
  nodes: PlacedIssue[];
  edges: PlacedEdge[];
  auxiliary: PlacedAuxiliaryEdge[];
  columns: number[];
  nodeOf: ReadonlyMap<string, PlacedIssue>;
};
