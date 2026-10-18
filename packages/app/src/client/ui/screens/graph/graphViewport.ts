import type { StageProgress } from "@/client/modules/graph/domain/epicPlan";
import type { GraphLayout } from "./graphLayout";
import { NODE_WIDTH } from "./graphLayout";

export const INITIAL_MIN_ZOOM = 0.75;
export const INITIAL_MAX_ZOOM = 1.25;
export const VIEWPORT_MARGIN = 40;
export const STAGE_LABEL_HEIGHT = 32;

/** 노드와 모든 간선의 꺾임점을 담는 범위입니다. 에픽 계획 보기는 열 위의 단계 이름 높이도 담습니다. */
export function graphBounds(layout: GraphLayout, planned: boolean) {
  const bends = [...layout.edges, ...layout.auxiliary].flatMap(({ points }) => points);
  const x = Math.min(0, ...layout.nodes.map((node) => node.x), ...bends.map(({ x }) => x));
  const y = Math.min(0, ...layout.nodes.map((node) => node.y)) - (planned ? STAGE_LABEL_HEIGHT : 0);
  const right = Math.max(
    0,
    ...layout.nodes.map((node) => node.x + NODE_WIDTH),
    ...bends.map(({ x }) => x),
  );
  const bottom = Math.max(
    0,
    ...layout.nodes.map((node) => node.y + node.height),
    ...bends.map(({ y }) => y),
  );
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * 그래프 전체가 첫 화면에 들어가지 않을 때 화면에 맞출 그래프 좌표의 점입니다.
 * center는 이 점을 화면 정중앙에, top은 화면 위쪽 여백 아래 가운데에 둡니다.
 */
export type GraphFocus = { x: number; y: number; anchor: "center" | "top" };

/** 이슈 중심 보기는 기준 이슈 노드의 중심을 맞춰, 선행 이슈는 왼쪽에, 후속 이슈는 오른쪽에 함께 보이게 합니다. */
export function issueFocus(layout: GraphLayout, issueId: string): GraphFocus | undefined {
  const node = layout.nodes.find(({ issue }) => issue.id === issueId);
  return node && { x: node.x + NODE_WIDTH / 2, y: node.y + node.height / 2, anchor: "center" };
}

/**
 * 에픽 계획 보기는 화면 위 진행 문구가 가리키는 진행 중 단계 열의 단계 이름을 맞춥니다. 모든 단계가 끝났으면 마지막 단계 열입니다.
 * 단계 이름은 모든 열에서 노드보다 STAGE_LABEL_HEIGHT만큼 위에 그립니다.
 */
export function stageFocus(
  layout: GraphLayout,
  { total, current }: StageProgress,
): GraphFocus | undefined {
  const column = layout.columns[current ?? total - 1];
  return column === undefined
    ? undefined
    : { x: column + NODE_WIDTH / 2, y: -STAGE_LABEL_HEIGHT, anchor: "top" };
}

/** focus를 주어진 배율에서 화면에 맞추는 viewport입니다. */
export function focusViewport(
  { x, y, anchor }: GraphFocus,
  width: number,
  height: number,
  zoom: number,
) {
  return {
    x: width / 2 - x * zoom,
    y: (anchor === "center" ? height / 2 : VIEWPORT_MARGIN) - y * zoom,
    zoom,
  };
}

/**
 * 그래프 전체가 하한 배율 이상으로 화면에 들어가면 전체 범위를 중앙에 둡니다.
 * 하한 배율로도 넘치면 범위 중심에는 간선만 지나가는 빈 곳이 보이기 쉬우므로, focus가 있으면 그 자리를 맞춥니다.
 */
export function initialGraphViewport(
  layout: GraphLayout,
  width: number,
  height: number,
  planned: boolean,
  focus?: GraphFocus,
) {
  const bounds = graphBounds(layout, planned);
  const fit = Math.min(
    (width - VIEWPORT_MARGIN * 2) / Math.max(1, bounds.width),
    (height - VIEWPORT_MARGIN * 2) / Math.max(1, bounds.height),
  );
  const zoom = Math.max(INITIAL_MIN_ZOOM, Math.min(INITIAL_MAX_ZOOM, fit));
  if (focus && fit < INITIAL_MIN_ZOOM) return focusViewport(focus, width, height, zoom);
  return {
    x: (width - bounds.width * zoom) / 2 - bounds.x * zoom,
    y: (height - bounds.height * zoom) / 2 - bounds.y * zoom,
    zoom,
  };
}
