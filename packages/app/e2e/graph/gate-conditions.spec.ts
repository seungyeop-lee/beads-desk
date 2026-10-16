import { writeFile } from "node:fs/promises";
import { expect, test } from "../support/bdWorkspace";

test("복수·공유 gate와 gate의 선행 조건을 실제 blocks 방향으로 표시하고 gate 기준 탐색도 유지한다", async ({
  page,
  workspace,
  request,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const { before, center, after, related } = await workspace.createIssues(
    {
      before: { title: "조건 선행 작업" },
      center: { title: "여러 조건을 기다리는 작업" },
      after: { title: "공유 조건을 기다리는 후속" },
      related: { title: "차단하지 않는 관련 메모" },
    },
    [
      ["center", "before"],
      ["after", "center"],
    ],
  );
  const createGate = async (title: string, work: string) =>
    JSON.parse(
      await workspace.bd(
        "gate",
        "create",
        "--type",
        "human",
        "--blocks",
        work,
        "--title",
        title,
        "--json",
      ),
    ).id as string;
  const shared = await createGate("여러 작업의 공통 대기 조건", center);
  const second = await createGate("두 번째 대기 조건", center);
  const gateBefore = await createGate("gate 자체의 선행 조건", second);
  await workspace.bd("dep", "add", after, shared);
  await workspace.bd("dep", "add", shared, before);
  await workspace.bd("dep", "add", center, related, "--type", "related");
  const original = (await (await request.get("/api/graph")).json()).data;
  await page.goto(`/issues?center=${center}`);
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const node = (title: string) => canvas.getByRole("link", { name: new RegExp(title) });
  await expect(node("gate 자체의 선행 조건")).toBeVisible();
  await canvas.getByRole("button", { name: "전체 보기", exact: true }).click();
  await expect(canvas.locator(".react-flow__node")).toHaveCount(7);
  for (const [from, to] of [
    [shared, center],
    [shared, after],
    [second, center],
    [gateBefore, second],
    [before, shared],
  ]) {
    await expect(canvas.getByLabel(`${to}의 선행 조건: ${from} (blocks)`)).toHaveCount(1);
  }
  await expect(canvas.getByLabel(`${before} 다음에 ${center}`)).toHaveCount(1);
  await expect(canvas.getByLabel(`${center} 다음에 ${after}`)).toHaveCount(1);
  await expect(canvas.locator(".graph-condition")).toHaveCount(5);
  await expect(canvas.locator(".graph-condition").first()).toHaveCSS("stroke-width", "3px");
  await expect(canvas.locator(".graph-auxiliary-related")).toHaveCount(1);
  await expect(canvas.locator(".graph-condition").first()).toHaveCSS("stroke-dasharray", "none");
  await expect(canvas.locator(".graph-auxiliary-related")).toHaveCSS(
    "stroke-dasharray",
    "3px, 5px",
  );
  const titles = [
    "조건 선행 작업",
    "여러 조건을 기다리는 작업",
    "공유 조건을 기다리는 후속",
    "여러 작업의 공통 대기 조건",
    "두 번째 대기 조건",
    "gate 자체의 선행 조건",
    "차단하지 않는 관련 메모",
  ];
  const boxes = await Promise.all(titles.map((title) => node(title).boundingBox()));
  for (let index = 3; index <= 5; index++) {
    expect(boxes[index]!.y).toBeGreaterThan(boxes[1]!.y + boxes[1]!.height);
    expect(boxes[index]!.x).toBeCloseTo(boxes[1]!.x, 0);
  }
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      expect(
        a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y,
      ).toBe(true);
    }
  await writeFile(
    testInfo.outputPath("gate-bounds.json"),
    JSON.stringify({ titles, boxes, dependencies: original.dependencies }, null, 2),
  );
  await page.screenshot({
    path: testInfo.outputPath("multiple-shared-gates.png"),
    animations: "disabled",
  });

  const mask = canvas
    .getByRole("img", { name: "그래프 미니맵" })
    .locator(".react-flow__minimap-mask");
  const beforeZoom = await mask.getAttribute("d");
  await canvas.getByRole("button", { name: "확대", exact: true }).click();
  await expect(mask).not.toHaveAttribute("d", beforeZoom!);
  await canvas.getByRole("button", { name: "축소", exact: true }).click();
  const beforePan = await mask.getAttribute("d");
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75 - 80, box.y + box.height * 0.8 - 60, { steps: 5 });
  await page.mouse.up();
  await expect(mask).not.toHaveAttribute("d", beforePan!);
  await canvas.getByRole("button", { name: "전체 보기", exact: true }).click();
  await node("여러 작업의 공통 대기 조건").click();
  await expect(page.getByRole("region", { name: `${shared} 이슈` })).toBeVisible();
  await page.keyboard.press("Escape");
  const afterView = (await (await request.get("/api/graph")).json()).data;
  expect(afterView.dependencies).toEqual(original.dependencies);
  expect(
    afterView.issues.map(({ id, status }: { id: string; status: string }) => [id, status]),
  ).toEqual(original.issues.map(({ id, status }: { id: string; status: string }) => [id, status]));

  await page.goto(`/issues?center=${shared}`);
  await expect(node("여러 작업의 공통 대기 조건")).toHaveAttribute("aria-current", "true");
  await expect(node("조건 선행 작업")).toBeVisible();
  await expect(node("공유 조건을 기다리는 후속")).toBeVisible();
  await expect(node("두 번째 대기 조건")).toHaveCount(0);
  await expect(canvas.locator(".react-flow__node")).toHaveCount(4);
  await page.setViewportSize({ width: 390, height: 844 });
  await canvas.getByRole("button", { name: "전체 보기", exact: true }).click();
  await node("여러 작업의 공통 대기 조건").click();
  const detail = page.getByRole("region", { name: `${shared} 이슈` });
  await expect(detail).toBeVisible();
  expect((await detail.boundingBox())!.y).toBeGreaterThan((await canvas.boundingBox())!.y);
  await page.screenshot({
    path: testInfo.outputPath("gate-center-narrow-detail.png"),
    animations: "disabled",
  });
});
