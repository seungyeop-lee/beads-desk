import { writeFile } from "node:fs/promises";
import { parseIssue } from "@beads-desk/bd/issue";
import type { GraphData } from "../../src/shared/contract/graph";
import { expect, test } from "../support/bdWorkspace";

const graph: GraphData = {
  issues: ["epic", "a", "b", "c"].map((id) =>
    parseIssue({
      id: `cycle-${id}`,
      title: `합성 순환 ${id.toUpperCase()}`,
      status: "open",
      issue_type: id === "epic" ? "epic" : "task",
      priority: 2,
      parent: id === "epic" ? null : "cycle-epic",
    })!,
  ),
  dependencies: [
    { issueId: "cycle-b", dependsOnId: "cycle-a", type: "blocks" },
    { issueId: "cycle-c", dependsOnId: "cycle-b", type: "blocks" },
    { issueId: "cycle-a", dependsOnId: "cycle-c", type: "blocks" },
  ],
  ancestorEpics: {
    "cycle-a": ["cycle-epic"],
    "cycle-b": ["cycle-epic"],
    "cycle-c": ["cycle-epic"],
  },
};

for (const scope of ["epic", "center"] as const) {
  test(`${scope} 그래프의 합성 blocks 순환 간선은 다른 노드를 피하면서 캔버스 안에 표시된다`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route("**/api/graph", (route) => route.fulfill({ json: { ok: true, data: graph } }));
    await page.goto(`/graph?${scope}=cycle-${scope === "epic" ? "epic" : "a"}`);
    const canvas = page.getByRole("region", { name: "의존 그래프" });
    const nodes = canvas.locator(".react-flow__node");
    const edges = canvas.locator(".react-flow__edge");
    await expect(nodes).toHaveCount(3);
    await expect(edges).toHaveCount(3);
    if (scope === "epic") {
      await expect(page.getByRole("alert").filter({ hasText: "blocks 관계가 순환" })).toBeVisible();
      await expect(canvas.getByText("1단계 · 진행 중")).toBeVisible();
      await expect(page.getByText("전체 1단계 중 1단계 진행 중")).toBeVisible();
    }

    const measurements = await canvas.evaluate((element) => {
      const boxes = [...element.querySelectorAll<HTMLElement>(".react-flow__node")].map((node) => ({
        id: node.dataset.id!,
        box: node.getBoundingClientRect().toJSON(),
      }));
      const bounds = element.getBoundingClientRect();
      const routes = [...element.querySelectorAll<SVGGElement>(".react-flow__edge")].map((edge) => {
        const path = edge.querySelector<SVGPathElement>("path.react-flow__edge-path")!;
        const transform = path.getScreenCTM()!;
        const length = path.getTotalLength();
        const points = Array.from({ length: 1001 }, (_, at) =>
          path.getPointAtLength((length * at) / 1000).matrixTransform(transform),
        );
        const id = edge.dataset.id!;
        const [from, to] = id.split("->");
        return {
          id,
          coveredBy: boxes
            .filter(({ id: nodeId }) => nodeId !== from && nodeId !== to)
            .filter(({ box }) =>
              points.some(
                ({ x, y }) => x > box.left && x < box.right && y > box.top && y < box.bottom,
              ),
            )
            .map(({ id: nodeId }) => nodeId),
          clipped: points.some(
            ({ x, y }) =>
              x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom,
          ),
        };
      });
      return { boxes, routes };
    });
    const measurementPath = testInfo.outputPath("synthetic-cycle-measurements.json");
    await writeFile(measurementPath, JSON.stringify(measurements, null, 2));
    await testInfo.attach("synthetic-cycle-measurements", {
      path: measurementPath,
      contentType: "application/json",
    });
    await page.screenshot({ path: testInfo.outputPath(`synthetic-cycle-${scope}.png`) });
    expect(new Set(measurements.boxes.map(({ box }) => box.x)).size).toBe(1);
    for (const route of measurements.routes) {
      expect(route.coveredBy, `${scope}: ${route.id} 간선을 가리는 노드`).toEqual([]);
      expect(route.clipped, `${scope}: ${route.id} 간선이 캔버스 밖으로 잘림`).toBe(false);
    }
  });
}
