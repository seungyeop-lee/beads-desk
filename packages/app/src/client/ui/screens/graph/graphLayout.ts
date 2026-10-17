import type { Issue } from "@beads-desk/bd/issue";
import type { AuxiliaryEdge } from "@/client/modules/graph/domain/centerGraph";
import type { OrderEdge } from "@/client/modules/graph/domain/executionOrder";

export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 76;
/** 에픽 계획 보기의 노드는 에픽 밖 표시와 대기 수를 담는 줄을 하나 더 둡니다. */
export const PLAN_NODE_HEIGHT = 96;

export type Point = { x: number; y: number };

export type PlacedIssue = { issue: Issue; x: number; y: number; height: number };

/** points는 출발 노드의 변에서 도착 노드의 변까지 직각으로 꺾이는 점입니다. 첫 점과 마지막 점은 노드 변 위에 있습니다. */
export type PlacedEdge = OrderEdge & { points: Point[] };
export type PlacedAuxiliaryEdge = AuxiliaryEdge & { points: Point[] };

/**
 * 화면 좌표와 실제 높이가 정해진 노드와, 노드를 피해 지나는 간선입니다.
 * edges는 blocks 간선이고 auxiliary는 관련·발견 간선입니다. columns는 열마다 왼쪽 끝의 x 좌표입니다.
 */
export type GraphLayout = {
  nodes: PlacedIssue[];
  edges: PlacedEdge[];
  auxiliary: PlacedAuxiliaryEdge[];
  columns: number[];
};
