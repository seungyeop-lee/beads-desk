import type { Locator, Page } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

/**
 * 좁은 창은 사용자가 보고한 Chrome 화면(110% 확대, 500×1410 화면 픽셀)을 CSS 픽셀로 옮긴 크기입니다.
 * 이 너비에서는 열이 세로로 쌓이고, 넓은 창에서는 네 열이 나란히 놓입니다.
 */
const VIEWPORTS = {
  좁은: { width: 455, height: 1282 },
  넓은: { width: 1280, height: 720 },
} as const;

test.use({ deviceScaleFactor: 1.1 });

const LONG_TITLE = "e2e 여러 줄로 감싸져 카드 높이가 달라지는 아주 긴 제목의 작업 ".repeat(3);
const SHORT_TASKS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 막힘 1개, 바로 작업 가능 여러 개, 진행 중과 닫힘 0개인 보드를 심습니다.
 * 바로 작업 가능 열은 우선순위 순이라, 우선순위가 가장 낮은 `last`가 맨 아래 카드가 됩니다.
 */
function seedBoard(workspace: BdWorkspace) {
  return workspace.createIssues(
    {
      blocker: { title: "e2e 먼저 끝낼 작업", priority: 1 },
      waiting: { title: "e2e 기다리는 작업", priority: 1 },
      stay: { title: "e2e 막힘 열에 놓아 볼 작업" },
      ...Object.fromEntries(
        Array.from({ length: SHORT_TASKS }, (_, index) => [
          `task${index}`,
          { title: `e2e 짧은 작업 ${index}` },
        ]),
      ),
      long: { title: LONG_TITLE, priority: 3 },
      last: { title: "e2e 맨 아래 작업", priority: 4 },
    },
    [["waiting", "blocker"]],
  );
}

function column(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

/** 열 상자와 그 안 카드 목록의 크기입니다. */
function measure(region: Locator) {
  return region.evaluate((section) => {
    const list = section.querySelector("ul")!;
    const cards = [...list.children].map((card) => card.getBoundingClientRect());
    const box = section.getBoundingClientRect();
    return {
      height: box.height,
      bottom: box.bottom,
      paddingBottom: parseFloat(getComputedStyle(section).paddingBottom),
      listHeight: list.getBoundingClientRect().height,
      listOverflows: list.scrollHeight > list.clientHeight,
      cardHeights: cards.map((card) => card.height),
      lastCardBottom: cards.at(-1)?.bottom ?? null,
    };
  });
}

/**
 * 카드를 집어 든 뒤 페이지를 스크롤해 놓을 열로 옮깁니다.
 * `dragTo`는 놓을 열을 화면에 보이려고 끌기가 시작되기 전에 스크롤해서, 그 자리에 온 다른 카드를 끌게 됩니다.
 */
async function dragAcrossScroll(page: Page, card: Locator, target: Locator) {
  await card.hover();
  await page.mouse.down();
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 10);
  await target.hover();
  await page.mouse.up();
}

/** 카드가 있는 열은 마지막 카드 아래에 안쪽 여백만 남기고, 목록 안에서 스크롤되거나 잘리지 않습니다. */
async function expectFitsCards(region: Locator) {
  const box = await measure(region);
  expect(box.lastCardBottom).not.toBeNull();
  expect(box.listOverflows).toBe(false);
  expect(Math.abs(box.bottom - box.paddingBottom - box.lastCardBottom!)).toBeLessThan(1);
}

for (const [label, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`${label} 창`, () => {
    test.use({ viewport });

    test("빈 열은 카드 한 장 높이만 남기고, 이슈가 있는 열은 자기 카드만큼만 늘어나며 긴 목록은 페이지가 스크롤된다", async ({
      page,
      workspace,
    }) => {
      await seedBoard(workspace);

      await page.goto("/board");
      const ready = column(page, "바로 작업 가능");
      await expect(ready.getByRole("listitem")).toHaveCount(SHORT_TASKS + 4);

      const shortCard = await ready
        .getByRole("listitem")
        .filter({ hasText: "e2e 짧은 작업 0" })
        .evaluate((card) => card.getBoundingClientRect().height);
      const longCard = await ready
        .getByRole("listitem")
        .filter({ hasText: LONG_TITLE.trim() })
        .evaluate((card) => card.getBoundingClientRect().height);
      expect(longCard).toBeGreaterThan(shortCard);

      await expectFitsCards(column(page, "막힘"));
      await expectFitsCards(ready);
      for (const name of ["진행 중", "닫힘"]) {
        const empty = await measure(column(page, name));
        expect(empty.cardHeights).toEqual([]);
        expect(Math.abs(empty.listHeight - shortCard)).toBeLessThan(2);
      }
      const blocked = await measure(column(page, "막힘"));
      const readyBox = await measure(ready);
      expect(readyBox.height).toBeGreaterThan(blocked.height);

      expect(
        await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight),
      ).toBe(true);
      const lastCard = ready.getByRole("link", { name: /e2e 맨 아래 작업/ });
      await lastCard.scrollIntoViewIfNeeded();
      await expect(lastCard).toBeInViewport({ ratio: 1 });
    });

    test("카드를 옮기거나 새로 만들거나 닫힌 이슈 기간을 바꾸면 열 높이를 다시 맞춘다", async ({
      page,
      workspace,
    }) => {
      const ids = await workspace.createIssues({
        move: { title: LONG_TITLE },
        done: { title: "e2e 이틀 전에 닫은 작업", status: "closed" },
      });
      // 방금 닫은 이슈가 이틀 전에 닫은 것으로 보이도록 브라우저 시각을 이틀 뒤로 둡니다.
      await page.clock.setFixedTime(Date.now() + 2 * DAY_MS);

      await page.goto("/board");
      const ready = column(page, "바로 작업 가능");
      const inProgress = column(page, "진행 중");
      const closed = column(page, "닫힘");
      await expect(ready.getByRole("listitem")).toHaveCount(1);
      await expect(closed.getByRole("listitem")).toHaveCount(0);
      const emptyHeight = (await measure(inProgress)).height;
      expect(Math.abs((await measure(closed)).height - emptyHeight)).toBeLessThan(1);

      await ready.getByRole("link", { name: /e2e 여러 줄로/ }).dragTo(inProgress);
      await expect
        .poll(async () => (await workspace.showIssue(ids.move)).status, { timeout: SAVE_TIMEOUT })
        .toBe("in_progress");
      await expect(inProgress.getByRole("listitem")).toHaveCount(1);
      await expect(ready.getByRole("listitem")).toHaveCount(0);
      expect(Math.abs((await measure(ready)).height - emptyHeight)).toBeLessThan(1);
      expect((await measure(inProgress)).height).toBeGreaterThan(emptyHeight);
      await expectFitsCards(inProgress);

      await workspace.createIssue("e2e 새로 만든 작업");
      await expect(ready.getByRole("listitem")).toHaveCount(1);
      await expectFitsCards(ready);

      const period = closed.getByRole("combobox", { name: "닫힌 이슈를 보일 기간" });
      await period.selectOption("3d");
      await expect(closed.getByRole("listitem")).toHaveCount(1);
      await expectFitsCards(closed);
      await period.selectOption("today");
      await expect(closed.getByRole("listitem")).toHaveCount(0);
      expect(Math.abs((await measure(closed)).height - emptyHeight)).toBeLessThan(1);
    });

    test("페이지를 스크롤해 맨 아래 카드를 빈 열로 옮기고, 막힘 열에는 놓지 못하며, 카드를 눌러 상세를 연다", async ({
      page,
      workspace,
    }) => {
      const ids = await seedBoard(workspace);

      await page.goto("/board");
      const ready = column(page, "바로 작업 가능");
      const blocked = column(page, "막힘");
      const inProgress = column(page, "진행 중");
      await expect(ready.getByRole("listitem")).toHaveCount(SHORT_TASKS + 4);

      await ready.getByRole("link", { name: /e2e 막힘 열에 놓아 볼 작업/ }).dragTo(blocked);
      await dragAcrossScroll(
        page,
        ready.getByRole("link", { name: /e2e 맨 아래 작업/ }),
        inProgress,
      );
      await expect
        .poll(async () => (await workspace.showIssue(ids.last)).status, { timeout: SAVE_TIMEOUT })
        .toBe("in_progress");
      await expect(inProgress.getByRole("listitem")).toHaveCount(1);
      // 쓰기는 서버에서 차례로 실행되므로, 뒤에 놓은 카드가 저장됐다면 막힘 열에 놓은 카드도 바뀌었을 시점입니다.
      expect((await workspace.showIssue(ids.stay)).status).toBe("open");
      await expect(blocked.getByRole("listitem")).toHaveCount(1);

      await inProgress.getByRole("link", { name: /e2e 맨 아래 작업/ }).click();
      await expect(page.getByRole("dialog", { name: `${ids.last} 이슈` })).toBeVisible();
    });
  });
}
