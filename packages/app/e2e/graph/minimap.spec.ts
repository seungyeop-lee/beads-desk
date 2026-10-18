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

  const afterPan = await mask.getAttribute("d");
  await canvas.getByRole("button", { name: "확대", exact: true }).click();
  await expect(mask).not.toHaveAttribute("d", afterPan!);
});

test("긴 사슬을 열면 기준 이슈가 첫 화면에 보이고, 미니맵은 기준 이슈만 강조하며 상태 색과 에픽 미니맵은 유지한다", async ({
  page,
  workspace,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const keys = Array.from({ length: 10 }, (_, index) => `task${index}`);
  const ids = await workspace.createIssues<string>(
    {
      epic: { title: "미니맵 긴 사슬", type: "epic" },
      ...Object.fromEntries(
        keys.map((key, index) => [
          key,
          { title: `미니맵 작업 ${index + 1}`, status: "closed", parent: "epic" },
        ]),
      ),
    },
    keys.slice(1).map((key, index) => [key, keys[index]!]),
  );
  const first = ids[keys[0]!]!;
  const last = ids[keys.at(-1)!]!;
  const canvas = page.getByRole("region", { name: "의존 그래프" });
  const minimap = canvas.getByRole("img", { name: "그래프 미니맵" });
  const nodes = minimap.locator(".react-flow__minimap-node");
  const highlighted = minimap.locator(".minimap-center");
  const nodeStyles = () =>
    nodes.evaluateAll((elements) =>
      elements.map((node) => ({
        x: Number(node.getAttribute("x")),
        fill: getComputedStyle(node).fill,
        stroke: getComputedStyle(node).stroke,
      })),
    );

  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`/graph?center=${last}`);
    await expect(nodes).toHaveCount(10);
    await expect(highlighted).toHaveCount(1);
    await expect(page.locator("html")).toHaveCSS("color-scheme", scheme);
    const center = canvas.locator(`[data-id="${last}"]`);
    await expect(center).toBeInViewport();
    const styles = await nodeStyles();
    expect(new Set(styles.map(({ fill }) => fill)).size).toBe(1);
    const rightmost = Math.max(...styles.map(({ x }) => x));
    await expect(highlighted).toHaveAttribute("x", String(rightmost));
    const centerStyle = styles.find(({ x }) => x === rightmost)!;
    expect(styles.filter(({ stroke }) => stroke === centerStyle.stroke)).toHaveLength(1);
    await expect(highlighted).toHaveCSS("vector-effect", "non-scaling-stroke");
    await page.screenshot({ path: testInfo.outputPath(`minimap-center-${scheme}.png`) });

    await page.goto(`/graph?center=${first}`);
    await expect(highlighted).toHaveCount(1);
    await expect(nodes).toHaveCount(10);
    await expect(highlighted).toHaveAttribute("x", "0");
    const changedStyles = await nodeStyles();
    expect(changedStyles.map(({ fill }) => fill)).toEqual(styles.map(({ fill }) => fill));
    expect(changedStyles.find(({ x }) => x === 0)!.stroke).toBe(centerStyle.stroke);

    await page.goto(`/graph?epic=${ids.epic}`);
    await expect(nodes).toHaveCount(10);
    await expect(highlighted).toHaveCount(0);
    const epicStyles = await nodeStyles();
    expect(new Set(epicStyles.map(({ stroke }) => stroke)).size).toBe(1);
    expect(epicStyles[0]!.stroke).not.toBe(centerStyle.stroke);
    expect(epicStyles.map(({ fill }) => fill)).toEqual(styles.map(({ fill }) => fill));
  }
});
