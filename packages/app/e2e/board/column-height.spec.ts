import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

const CARD_COUNT = 14;

/**
 * 1280x720 viewport에서 바로 작업 가능 열의 높이를 넘길 만큼 카드를 심습니다.
 * 열은 우선순위 순이라, 우선순위가 가장 낮은 `last`가 맨 아래 카드가 됩니다.
 */
function seedManyReadyIssues(workspace: BdWorkspace) {
  return workspace.createIssues({
    ...Object.fromEntries(
      Array.from({ length: CARD_COUNT - 1 }, (_, index) => [
        `task${index}`,
        { title: `e2e 쌓인 작업 ${index}` },
      ]),
    ),
    last: { title: "e2e 맨 아래 작업", priority: 4 },
  });
}

test("카드가 많은 열은 그 안에서 스크롤되고, 모든 열이 화면 아래 끝까지 채워지며 페이지는 스크롤되지 않는다", async ({
  page,
  workspace,
}) => {
  await seedManyReadyIssues(workspace);

  await page.goto("/board");
  const ready = page.getByRole("region", { name: "바로 작업 가능" });
  await expect(ready.getByRole("listitem")).toHaveCount(CARD_COUNT);

  const list = ready.getByRole("list");
  expect(await list.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
  ).toBe(true);
  await expect(ready.getByRole("heading")).toBeInViewport();

  const readyBox = (await ready.boundingBox())!;
  const emptyBox = (await page.getByRole("region", { name: "진행 중" }).boundingBox())!;
  expect(emptyBox.height).toBe(readyBox.height);
  expect(page.viewportSize()!.height - (emptyBox.y + emptyBox.height)).toBeLessThan(80);
});

test("스크롤되는 열의 맨 아래 카드를 다른 열로 끌어 놓으면 그 열의 상태로 바뀐다", async ({
  page,
  workspace,
}) => {
  const ids = await seedManyReadyIssues(workspace);

  await page.goto("/board");
  const ready = page.getByRole("region", { name: "바로 작업 가능" });
  await expect(ready.getByRole("listitem")).toHaveCount(CARD_COUNT);

  const lastCard = ready.getByRole("link", { name: /e2e 맨 아래 작업/ });
  await lastCard.scrollIntoViewIfNeeded();
  await lastCard.dragTo(page.getByRole("region", { name: "진행 중" }));

  await expect
    .poll(async () => (await workspace.showIssue(ids.last)).status, { timeout: SAVE_TIMEOUT })
    .toBe("in_progress");
});
