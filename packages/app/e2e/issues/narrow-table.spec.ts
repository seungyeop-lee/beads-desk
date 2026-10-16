import type { Locator, Page } from "@playwright/test";
import { koMessages as messages } from "../../src/client/modules/locale/domain/koMessages";
import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

const TITLES = {
  ko: "이슈를 작업 상태로 나눠 보이는 곳은 모두 같은 기준을 쓰고, 기준에는 bd 저장 상태와 의존 관계와 human 라벨을 씁니다",
  en: "Issues keep a long English title readable while status, priority, and assignee stay reachable",
  blocker: "막는 작업",
};
/** Chrome 110%에서 폭 500px 창의 CSS viewport는 454px이고, 세로 scrollbar가 항상 보이면 441px입니다. */
const WIDTHS = [441, 454, 480, 500, 768, 1024, 1440];
/** 제목이 몇 글자씩 세로로 갈라지지 않는 제목 칸의 최소 폭입니다. */
const MIN_TITLE_WIDTH = 240;
const TYPES = { ko: "feature", en: "task", blocker: "bug" } as const;

for (const { zoom, deviceScaleFactor } of [
  { zoom: "100%", deviceScaleFactor: 2 },
  { zoom: "110%", deviceScaleFactor: 2.2 },
]) {
  test.describe(`확대율 ${zoom}`, () => {
    test.use({ deviceScaleFactor });

    test("좁은 창에서도 ID·유형·제목이 표 영역 안에 다 보이고, 나머지 열은 표 안에서 스크롤해 볼 수 있다", async ({
      page,
      workspace,
    }) => {
      const ids = await seedIssues(workspace);
      await page.goto("/issues");
      await expect(titleRow(page, TITLES.ko)).toContainText(TITLES.blocker);

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await expect
          .poll(
            () =>
              page.evaluate(
                () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
              ),
            { message: `${width}px 페이지 가로 넘침` },
          )
          .toBe(0);
        for (const key of ["ko", "en", "blocker"] as const) {
          const title = TITLES[key];
          const row = titleRow(page, title);
          const layout = await row.evaluate((tr: HTMLTableRowElement) => {
            const scroller = tr.closest("table")!.parentElement!;
            scroller.scrollLeft = 0;
            const cell = tr.cells[2]!.getBoundingClientRect();
            return {
              width: cell.width,
              right: cell.right,
              visibleRight: scroller.getBoundingClientRect().right,
            };
          });
          const where = `${width}px ${title.slice(0, 12)}`;
          expect(layout.width, `${where} 제목 칸 폭`).toBeGreaterThanOrEqual(MIN_TITLE_WIDTH);
          expect(layout.right, `${where} 제목 칸 오른쪽 끝`).toBeLessThanOrEqual(
            layout.visibleRight,
          );
          await inArea(row.getByRole("button", { name: messages.issueTable.copyIdOf(ids[key]) }));
          await inArea(
            row
              .getByText(messages.issue.types[TYPES[key]], { exact: true })
              .locator("visible=true"),
          );
          for (const control of await row.getByRole("combobox").all()) {
            await accessible(control, page);
          }
          await accessible(row.getByRole("cell").last(), page);
        }
      }
    });
  });
}

test.describe("확대율 110%, 폭 500px 창", () => {
  test.use({ deviceScaleFactor: 2.2, viewport: { width: 441, height: 900 } });

  test("좁은 창에서 제목으로 상세를 열고, 표에서 우선순위를 바꾼다", async ({
    page,
    workspace,
  }) => {
    const ids = await seedIssues(workspace);
    await page.goto("/issues");

    await titleRow(page, TITLES.en).getByRole("link", { name: TITLES.en, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: messages.issueDetail.dialog(ids.en) });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: messages.common.close, exact: true }).first().click();
    await expect(dialog).toBeHidden();

    const priority = titleRow(page, TITLES.ko).getByRole("combobox", {
      name: messages.issueTable.priorityOf(ids.ko),
    });
    await accessible(priority, page);
    await priority.selectOption("0");
    await expect
      .poll(async () => (await workspace.showIssue(ids.ko)).priority, { timeout: SAVE_TIMEOUT })
      .toBe(0);
  });
});

/** 긴 제목의 이슈 둘과, 그 가운데 하나를 막는 이슈를 심습니다. */
async function seedIssues(workspace: BdWorkspace) {
  return workspace.createIssues(
    {
      ko: { title: TITLES.ko, type: TYPES.ko, priority: 2, assignee: "minji" },
      en: { title: TITLES.en, type: TYPES.en },
      blocker: { title: TITLES.blocker, type: TYPES.blocker },
    },
    [["ko", "blocker"]],
  );
}

function titleRow(page: Page, title: string) {
  return page
    .getByRole("main")
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
}

/** 표를 스크롤하지 않은 채로 요소가 표 영역 안에 다 보이는지 확인합니다. */
async function inArea(element: Locator) {
  await expect(element).toBeVisible();
  const { left, right, areaLeft, areaRight } = await element.evaluate((node) => {
    const scroller = node.closest("table")!.parentElement!;
    const box = node.getBoundingClientRect();
    const area = scroller.getBoundingClientRect();
    return { left: box.left, right: box.right, areaLeft: area.left, areaRight: area.right };
  });
  expect(left).toBeGreaterThanOrEqual(areaLeft);
  expect(right).toBeLessThanOrEqual(areaRight);
}

/** 표 안에서 스크롤해 조작이 창 안에 다 들어오는지 확인합니다. */
async function accessible(control: Locator, page: Page) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport({ ratio: 1 });
  const box = (await control.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
}
