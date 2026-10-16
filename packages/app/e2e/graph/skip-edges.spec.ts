import type { Locator } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";

type Box = { x: number; y: number; width: number; height: number };

/** 간선 선을 따라 일정 간격으로 고른 점을 화면 좌표로 돌려줍니다. */
async function pathPoints(edge: Locator): Promise<{ x: number; y: number }[]> {
  return edge
    .locator("path")
    .first()
    .evaluate((path: SVGPathElement) => {
      const matrix = path.getScreenCTM()!;
      const length = path.getTotalLength();
      return Array.from({ length: 101 }, (_, at) => {
        const point = path.getPointAtLength((length * at) / 100).matrixTransform(matrix);
        return { x: point.x, y: point.y };
      });
    });
}

const inside = ({ x, y }: { x: number; y: number }, box: Box) =>
  x > box.x && x < box.x + box.width && y > box.y && y < box.y + box.height;

test("에픽 순서 보기와 선행·후속 그래프에서 한 열 이상을 건너뛰는 간선도 가운데 열의 노드 밑을 지나지 않아, 모든 간선이 끝까지 보인다", async ({
  page,
  workspace,
}) => {
  const ids = await workspace.createIssues(
    {
      epic: { title: "건너뛰기 에픽", type: "epic" },
      a: { title: "건너뛰기 처음", parent: "epic" },
      b: {
        title:
          "건너뛰기 가운데 A long English title changes this node height without hiding the dependency edges that skip it and connect to later stages",
        parent: "epic",
      },
      c: {
        title:
          "건너뛰기 마지막 긴 한국어 제목이 여러 줄로 늘어나도 다른 노드와 간선이 겹치지 않고 모든 글자를 끝까지 표시합니다",
        parent: "epic",
      },
      d: { title: "건너뛰기 다음", parent: "epic" },
    },
    [
      ["b", "a"],
      ["c", "a"],
      ["c", "b"],
      ["d", "a"],
      ["d", "c"],
    ],
  );

  const titles = {
    a: "건너뛰기 처음",
    b: "건너뛰기 가운데",
    c: "건너뛰기 마지막",
    d: "건너뛰기 다음",
  };
  const edges: [keyof typeof titles, keyof typeof titles][] = [
    ["a", "b"],
    ["a", "c"],
    ["b", "c"],
    ["a", "d"],
    ["c", "d"],
  ];
  for (const url of [`/graph?epic=${ids.epic}`, `/graph?center=${ids.a}`]) {
    await page.goto(url);
    const canvas = page.getByRole("region", { name: "의존 그래프" });
    const node = (key: keyof typeof titles) =>
      canvas.getByRole("link", { name: new RegExp(titles[key]) });
    await expect(node("d")).toBeVisible();

    const boxes = Object.fromEntries(
      await Promise.all(
        (Object.keys(titles) as (keyof typeof titles)[]).map(
          async (key) => [key, (await node(key).boundingBox())!] as const,
        ),
      ),
    );
    for (const [from, to] of edges) {
      const edge = canvas.getByRole("img", { name: `${ids[from]} 다음에 ${ids[to]}` });
      const points = await pathPoints(edge);
      const covering = Object.entries(boxes)
        .filter(([key]) => key !== from && key !== to)
        .filter(([, box]) => points.some((point) => inside(point, box)))
        .map(([key]) => key);
      expect(covering, `${url}에서 ${from} → ${to} 간선을 가리는 노드`).toEqual([]);
    }
  }
});
