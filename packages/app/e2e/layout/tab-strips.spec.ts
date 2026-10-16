import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";

const WIDE = 1440;
const NARROW = 390;

test("이슈 화면의 보기 탭 줄은 세로로 스크롤되지 않고, 좁은 창에서만 가로로 스크롤된다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssues({
    doing: { title: "진행하는 작업", type: "task", status: "in_progress" },
    done: { title: "끝난 작업", type: "task", status: "closed" },
  });
  await page.setViewportSize({ width: WIDE, height: 900 });
  await page.goto("/issues");
  const tabs = page.getByRole("navigation", { name: "보기" });
  const current = tabs.getByRole("link", { name: "전체 2" });
  await expect(current).toHaveAttribute("aria-current", "page");

  expect(await scrollSize(tabs)).toEqual({ vertical: false, horizontal: false });
  await expectUnderlineOnBottomEdge(page, tabs, current);

  await page.setViewportSize({ width: NARROW, height: 900 });
  expect(await scrollSize(tabs)).toEqual({ vertical: false, horizontal: true });
  await expectUnderlineOnBottomEdge(page, tabs, current);

  const last = tabs.getByRole("link", { name: "닫힘 1" });
  await last.scrollIntoViewIfNeeded();
  const navBox = (await tabs.boundingBox())!;
  const lastBox = (await last.boundingBox())!;
  // 탭 폭이 소수점 단위라 끝까지 스크롤해도 마지막 탭이 1px 미만으로 잘릴 수 있습니다.
  expect(lastBox.x + lastBox.width).toBeLessThanOrEqual(navBox.x + navBox.width + 1);
  await last.click();
  await expect(page).toHaveURL(/\/issues\?view=closed$/);
  await expect(last).toHaveAttribute("aria-current", "page");
  await expectUnderlineOnBottomEdge(page, tabs, last);
});

test("상단 화면 탭 줄은 세로로 스크롤되지 않는다", async ({ page }) => {
  await page.goto("/issues");
  const tabs = page.getByRole("navigation", { name: "화면" });
  for (const width of [WIDE, NARROW]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(tabs.getByRole("link").first()).toBeVisible();
    expect((await scrollSize(tabs)).vertical).toBe(false);
  }
});

/** 탭 줄을 각 방향으로 스크롤할 내용이 있는지 돌려줍니다. */
function scrollSize(nav: Locator) {
  return nav.evaluate((element) => ({
    vertical: element.scrollHeight > element.clientHeight,
    horizontal: element.scrollWidth > element.clientWidth,
  }));
}

/**
 * 고른 탭의 밑줄이 탭 줄 아래 경계에 닿고, 그 맨 아래 줄이 잘리지 않고 탭으로 보이는지 확인합니다.
 * 탭 줄이 넘친 내용을 잘라 내면 그 자리에서는 탭이 아니라 탭 줄이 잡힙니다.
 */
async function expectUnderlineOnBottomEdge(page: Page, nav: Locator, tab: Locator) {
  const navBox = (await nav.boundingBox())!;
  const tabBox = (await tab.boundingBox())!;
  expect(tabBox.y + tabBox.height).toBeCloseTo(navBox.y + navBox.height, 1);
  const hit = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest("a")?.textContent ?? null,
    { x: tabBox.x + tabBox.width / 2, y: navBox.y + navBox.height - 0.5 },
  );
  expect(hit).toBe(await tab.textContent());
}
