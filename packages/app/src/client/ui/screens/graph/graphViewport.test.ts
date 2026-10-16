import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import type { GraphLayout } from "./graphLayout";
import {
  initialGraphViewport,
  graphBounds,
  INITIAL_MAX_ZOOM,
  INITIAL_MIN_ZOOM,
} from "./graphViewport";

const layout: GraphLayout = {
  nodes: [
    { issue: { id: "a" } as Issue, x: 0, y: 0, height: 140 },
    { issue: { id: "b" } as Issue, x: 352, y: 0, height: 76 },
  ],
  edges: [],
  nodeHeight: 76,
};

test.each([
  [900, 600],
  [1800, 1100],
])("작은 그래프는 과도하게 확대하지 않고 중앙에 놓는다: %i×%i", (width, height) => {
  const bounds = graphBounds(layout, true);
  const viewport = initialGraphViewport(layout, width, height, true);
  expect(viewport.zoom).toBe(INITIAL_MAX_ZOOM);
  expect(viewport.x + (bounds.x + bounds.width / 2) * viewport.zoom).toBe(width / 2);
  expect(viewport.y + (bounds.y + bounds.height / 2) * viewport.zoom).toBe(height / 2);
});

test("큰 그래프는 글자가 너무 작아지지 않게 배율을 제한하면서 중앙에 놓는다", () => {
  const large = { ...layout, nodes: layout.nodes.map((node, i) => ({ ...node, x: i * 3000 })) };
  const viewport = initialGraphViewport(large, 900, 600, false);
  expect(viewport.zoom).toBe(INITIAL_MIN_ZOOM);
  expect(viewport.x + (graphBounds(large, false).width / 2) * viewport.zoom).toBe(450);
});

test("gate와 이어진 간선이 꺾이는 점도 초기 보기 범위에 포함한다", () => {
  const withCondition = {
    ...layout,
    edges: [
      {
        from: "a",
        to: "b",
        passes: [],
        condition: [
          { x: -20, y: 70 },
          { x: 740, y: 260 },
        ],
      },
    ],
  };
  expect(graphBounds(withCondition, false)).toEqual({ x: -20, y: 0, width: 760, height: 260 });
});
