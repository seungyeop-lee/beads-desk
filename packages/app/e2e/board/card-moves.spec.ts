import type { Page } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";
import { dragAcrossScroll } from "../support/dragAndDrop";

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

test("보드는 막힘, 바로 작업 가능, 진행 중, 닫힘 열만 보이고, 카드를 옮기거나 닫힌 이슈 기간을 바꾸면 열의 카드가 바뀐다", async ({
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
  await expect(page.getByRole("region")).toHaveText([
    /^막힘/,
    /^바로 작업 가능/,
    /^진행 중/,
    /^닫힘/,
  ]);
  const ready = column(page, "바로 작업 가능");
  const inProgress = column(page, "진행 중");
  const closed = column(page, "닫힘");
  await expect(ready.getByRole("listitem")).toHaveCount(1);
  await expect(closed.getByRole("listitem")).toHaveCount(0);

  await ready.getByRole("link", { name: /e2e 여러 줄로/ }).dragTo(inProgress);
  await expect
    .poll(async () => (await workspace.showIssue(ids.move)).status, {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("in_progress");
  await expect(inProgress.getByRole("listitem")).toHaveCount(1);
  await expect(ready.getByRole("listitem")).toHaveCount(0);

  const period = closed.getByRole("combobox", {
    name: "닫힌 이슈를 보일 기간",
  });
  await period.selectOption("3d");
  await expect(closed.getByRole("listitem")).toHaveCount(1);
  await period.selectOption("today");
  await expect(closed.getByRole("listitem")).toHaveCount(0);
});

test.describe("열이 세로로 쌓이는 좁은 창", () => {
  // 사용자가 보고한 Chrome 화면(110% 확대, 500×1410 화면 픽셀)을 CSS 픽셀로 옮긴 크기입니다.
  test.use({ viewport: { width: 455, height: 1282 }, deviceScaleFactor: 1.1 });

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
    await dragAcrossScroll(ready.getByRole("link", { name: /e2e 맨 아래 작업/ }), inProgress);
    await expect
      .poll(async () => (await workspace.showIssue(ids.last)).status, {
        timeout: SAVE_TIMEOUT,
      })
      .toBe("in_progress");
    await expect(inProgress.getByRole("listitem")).toHaveCount(1);
    // 쓰기는 서버에서 차례로 실행되므로, 뒤에 놓은 카드가 저장됐다면 막힘 열에 놓은 카드도 바뀌었을 시점입니다.
    expect((await workspace.showIssue(ids.stay)).status).toBe("open");
    await expect(blocked.getByRole("listitem")).toHaveCount(1);

    await inProgress.getByRole("link", { name: /e2e 맨 아래 작업/ }).click();
    await expect(page.getByRole("dialog", { name: `${ids.last} 이슈` })).toBeVisible();
  });
});
