import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";

const LONG_TITLE = "도움말 툴팁이 화면 안에 보이는지 확인하려고 제목을 길게 늘인";

async function expectInsideViewport(page: Page, tooltip: Locator) {
  await expect(tooltip).toBeVisible();
  const box = (await tooltip.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

test("좁은 화면에서 제목이 길어도 그래프 화면의 도움말은 마우스를 올리거나 키보드 초점을 두면 화면 안에 모두 보인다", async ({
  page,
  workspace,
}) => {
  const { epic, center } = await workspace.createIssues(
    {
      epic: { title: `${LONG_TITLE} 에픽`, type: "epic" },
      first: { title: "도움말 선행", parent: "epic" },
      center: { title: `${LONG_TITLE} 가운데 이슈`, parent: "epic" },
    },
    [["center", "first"]],
  );
  const screens = [
    [`/graph?epic=${epic}`, /^에픽에 속한 이슈를 blocks 관계를 따라/],
    [`/graph?center=${center}`, /^이 이슈가 기다리는 이슈와/],
  ] as const;

  // 480px에서는 header가 설명의 최대 폭(32rem)보다 좁습니다.
  for (const width of [768, 480])
    for (const [url, help] of screens) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(url);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(LONG_TITLE);
      const button = page.getByRole("button", { name: help });
      const tooltip = page.getByText(help);
      await expect(tooltip).toBeHidden();

      await button.hover();
      await expectInsideViewport(page, tooltip);

      await page.mouse.move(0, 0);
      await expect(tooltip).toBeHidden();
      await page.getByRole("heading", { level: 1 }).getByRole("link").focus();
      await page.keyboard.press("Tab");
      await expect(button).toBeFocused();
      await expectInsideViewport(page, tooltip);
    }
});
