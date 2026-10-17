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

export function initialGraphViewport(
  layout: GraphLayout,
  width: number,
  height: number,
  planned: boolean,
) {
  const bounds = graphBounds(layout, planned);
  const zoom = Math.max(
    INITIAL_MIN_ZOOM,
    Math.min(
      INITIAL_MAX_ZOOM,
      (width - VIEWPORT_MARGIN * 2) / Math.max(1, bounds.width),
      (height - VIEWPORT_MARGIN * 2) / Math.max(1, bounds.height),
    ),
  );
  return {
    x: (width - bounds.width * zoom) / 2 - bounds.x * zoom,
    y: (height - bounds.height * zoom) / 2 - bounds.y * zoom,
    zoom,
  };
}
