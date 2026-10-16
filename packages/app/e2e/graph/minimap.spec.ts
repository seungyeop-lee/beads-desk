import { expect, test } from "../support/bdWorkspace";

test("그래프 캔버스에는 미니맵이 있고, 캔버스를 끌어 옮기면 미니맵의 보이는 영역 표시도 옮겨진다", async ({
  page,
  workspace,
}) => {
  const { second } = await workspace.createIssues(
    { first: { title: "미니맵 먼저" }, second: { title: "미니맵 나중" } },
    [["second", "first"]],
  );

  await page.goto(`/graph?center=${second}`);
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  await expect(canvas.getByRole("link", { name: /미니맵 나중/ })).toBeVisible();
  const minimap = canvas.getByRole("img", { name: "그래프 미니맵" });
  await expect(minimap).toBeVisible();

  // 미니맵은 보이지 않는 영역을 덮는 path의 구멍으로 지금 보이는 영역을 나타냅니다.
  const mask = minimap.locator(".react-flow__minimap-mask");
  const before = await mask.getAttribute("d");

  // 노드는 왼쪽 위에 모여 있으므로 캔버스 가운데 아래쪽의 빈 곳을 끕니다.
  const box = (await canvas.boundingBox())!;
  const start = { x: box.x + box.width * 0.4, y: box.y + box.height * 0.6 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 120, start.y - 80, { steps: 5 });
  await page.mouse.up();

  await expect(mask).not.toHaveAttribute("d", before!);
});
