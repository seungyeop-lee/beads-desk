import type { Locator, Page } from "@playwright/test";
import { koMessages as messages } from "../../src/client/modules/locale/domain/koMessages";
import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

const TITLES = {
  ko: "이슈를 작업 상태로 나눠 보이는 곳은 모두 같은 기준을 쓰고, 기준에는 bd 저장 상태와 의존 관계와 human 라벨을 씁니다",
  en: "Issues keep a long English title readable while status, priority, and assignee stay reachable",
  blocker: "막는 작업",
};
const TYPES = { ko: "feature", en: "task", blocker: "bug" } as const;

test.describe("확대율 110%, 폭 500px 창", () => {
  test.use({ deviceScaleFactor: 2.2, viewport: { width: 441, height: 900 } });

  test("좁은 창에서 제목으로 상세를 열고, 표에서 우선순위를 바꾼다", async ({
    page,
    workspace,
  }) => {
    const ids = await seedIssues(workspace);
    await page.goto("/issues");

    await titleRow(page, TITLES.en).getByRole("link", { name: TITLES.en, exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: messages.issueDetail.dialog(ids.en),
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: messages.common.close, exact: true }).first().click();
    await expect(dialog).toBeHidden();

    const priority = titleRow(page, TITLES.ko).getByRole("combobox", {
      name: messages.issueTable.priorityOf(ids.ko),
    });
    await accessible(priority, page);
    await priority.selectOption("0");
    await expect
      .poll(async () => (await workspace.showIssue(ids.ko)).priority, {
        timeout: SAVE_TIMEOUT,
      })
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

/** 표 안에서 스크롤해 조작이 창 안에 다 들어오는지 확인합니다. */
async function accessible(control: Locator, page: Page) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport({ ratio: 1 });
  const box = (await control.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
}
