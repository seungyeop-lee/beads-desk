import { expect, test } from "vitest";
import { issue } from "@/shared/domain/issues/issueFixture";
import type { GraphLayout } from "./graphLayout";
import { NODE_WIDTH } from "./graphLayout";
import {
  initialGraphViewport,
  graphBounds,
  INITIAL_MAX_ZOOM,
  INITIAL_MIN_ZOOM,
  issueFocus,
  STAGE_LABEL_HEIGHT,
  stageFocus,
} from "./graphViewport";

/** 배치 결과가 nodeOf를 함께 돌려주므로, 직접 만드는 배치에도 같은 맵을 채웁니다. */
const withNodeOf = (layout: Omit<GraphLayout, "nodeOf">): GraphLayout => ({
  ...layout,
  nodeOf: new Map(layout.nodes.map((node) => [node.issue.id, node])),
});

const layout: GraphLayout = withNodeOf({
  nodes: [
    { issue: issue("a"), x: 0, y: 0, height: 140 },
    { issue: issue("b"), x: 352, y: 0, height: 76 },
  ],
  edges: [],
  auxiliary: [],
  columns: [0, 352],
});

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

test("blocks 간선과 관련·발견 간선의 꺾임점도 초기 보기 범위에 포함한다", () => {
  const withBends: GraphLayout = {
    ...layout,
    edges: [
      {
        from: "a",
        to: "b",
        points: [
          { x: 280, y: 70 },
          { x: 300, y: 70 },
          { x: 300, y: 260 },
        ],
      },
    ],
    auxiliary: [
      {
        from: "a",
        to: "b",
        type: "related",
        points: [
          { x: 0, y: 70 },
          { x: -20, y: 70 },
        ],
      },
    ],
  };
  expect(graphBounds(withBends, false)).toEqual({ x: -20, y: 0, width: 652, height: 260 });
});

/** 열 10개와 행 8개로 0.75배에서도 900×600 화면보다 가로세로 모두 큰 그래프입니다. 왼쪽 열일수록 노드가 많습니다. */
const COLUMNS = Array.from({ length: 10 }, (_, column) => column * 352);
const large: GraphLayout = withNodeOf({
  nodes: COLUMNS.flatMap((x, column) =>
    Array.from({ length: 8 - Math.floor(column / 2) }, (_, row) => ({
      issue: issue(`c${column}r${row}`),
      x,
      y: row * 160,
      height: 96,
    })),
  ),
  edges: [],
  auxiliary: [],
  columns: COLUMNS,
});

/** 그래프 좌표의 사각형이 첫 화면 안에 모두 들어가는지 봅니다. */
function onScreen(
  viewport: { x: number; y: number; zoom: number },
  rect: { x: number; y: number; width: number; height: number },
  width: number,
  height: number,
) {
  const left = viewport.x + rect.x * viewport.zoom;
  const top = viewport.y + rect.y * viewport.zoom;
  return (
    left >= 0 &&
    top >= 0 &&
    left + rect.width * viewport.zoom <= width &&
    top + rect.height * viewport.zoom <= height
  );
}

test.each(["c0r0", "c4r2", "c9r3"])(
  "하한 배율로도 화면보다 큰 그래프는 기준 이슈 노드의 중심을 첫 화면 중앙에 놓는다: %s",
  (id) => {
    const node = large.nodes.find(({ issue }) => issue.id === id)!;
    const viewport = initialGraphViewport(large, 900, 600, false, issueFocus(large, id));
    expect(viewport.zoom).toBe(INITIAL_MIN_ZOOM);
    expect(viewport.x + (node.x + NODE_WIDTH / 2) * viewport.zoom).toBe(450);
    expect(viewport.y + (node.y + node.height / 2) * viewport.zoom).toBe(300);
  },
);

test.each([
  ["진행 중 단계", 6, 6],
  ["모든 단계가 끝나면 마지막 단계", null, 9],
])(
  "하한 배율로도 화면보다 큰 에픽 계획은 %s 열의 맨 위 노드와 단계 이름을 첫 화면 안에 둔다",
  (_, current, stage) => {
    const viewport = initialGraphViewport(
      large,
      900,
      600,
      true,
      stageFocus(large, { total: COLUMNS.length, current }),
    );
    expect(viewport.zoom).toBe(INITIAL_MIN_ZOOM);
    const x = COLUMNS[stage]!;
    const label = { x, y: -STAGE_LABEL_HEIGHT, width: NODE_WIDTH, height: STAGE_LABEL_HEIGHT };
    const top = large.nodes.find((node) => node.x === x && node.y === 0)!;
    expect(onScreen(viewport, label, 900, 600)).toBe(true);
    expect(onScreen(viewport, { ...top, width: NODE_WIDTH }, 900, 600)).toBe(true);
  },
);

test("전체가 들어가는 그래프는 기준 이슈나 진행 중 단계가 있어도 전체 범위를 중앙에 놓는다", () => {
  const centered = initialGraphViewport(layout, 900, 600, true);
  expect(initialGraphViewport(layout, 900, 600, false, issueFocus(layout, "b"))).toEqual(
    initialGraphViewport(layout, 900, 600, false),
  );
  expect(
    initialGraphViewport(layout, 900, 600, true, stageFocus(layout, { total: 2, current: 1 })),
  ).toEqual(centered);
});
