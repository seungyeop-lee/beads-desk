import type { Issue } from "@beads-desk/bd/issue";
import type { AuxiliaryEdge } from "@/client/modules/graph/domain/centerGraph";
import type { ExecutionOrder } from "@/client/modules/graph/domain/executionOrder";
import { conditionLayout } from "./conditionLayout";
import { centerLayout, type GraphLayout, layeredLayout } from "./graphLayout";

export type GraphLayoutInput = {
  order: ExecutionOrder;
  /** 실제로 잰 카드 높이입니다. 아직 재지 않은 이슈는 nodeHeight로 놓습니다. */
  heights: ReadonlyMap<string, number>;
  nodeHeight: number;
  /** 이슈 중심 보기에서 blocks 사슬 밖에 함께 그리는 관련·발견 이슈와 그 간선입니다. */
  auxiliary?: { issue: Issue | undefined; extra: Issue[]; auxiliary: AuxiliaryEdge[] };
};

/** 그래프 모달과 에픽 계획 화면이 함께 쓰는 배치 진입점입니다. 노드 좌표와 간선 경로를 함께 정합니다. */
export function layoutGraph({
  order,
  heights,
  nodeHeight,
  auxiliary,
}: GraphLayoutInput): GraphLayout {
  if (!auxiliary) return layeredLayout(order, nodeHeight, heights);
  return centerLayout(
    conditionLayout(order, heights),
    auxiliary.extra,
    auxiliary.auxiliary,
    auxiliary.issue,
    heights,
  );
}
