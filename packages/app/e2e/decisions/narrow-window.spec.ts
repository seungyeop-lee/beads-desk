import type { Locator, Page } from "@playwright/test";
import { koMessages as messages } from "../../src/client/modules/locale/domain/koMessages";
import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

const KOREAN =
  "이슈를 작업 상태로 나눠 보이는 곳은 모두 같은 기준을 쓰고, 기준에는 bd 저장 상태와 의존 관계와 human 라벨을 씁니다";
const ENGLISH =
  "Decisions keep a long English title readable while status, supersession, and dates stay reachable";
const TITLES = {
  koOld: `이전 ${KOREAN}`,
  koNew: `새 ${KOREAN}`,
  enOld: `Old ${ENGLISH}`,
  enNew: `New ${ENGLISH}`,
};
test.describe("확대율 110%, 폭 500px 창", () => {
  test.use({ deviceScaleFactor: 2.2, viewport: { width: 441, height: 900 } });

  test("좁은 창에서 제목으로 상세를 열고, 이전·새 결정 링크로 이동하고, 상태를 바꾼다", async ({
    page,
    workspace,
  }) => {
    const ids = await seedDecisions(workspace);
    await page.goto("/decisions");

    await titleRow(page, TITLES.enNew)
      .getByRole("link", { name: TITLES.enNew, exact: true })
      .click();
    await closeDetail(page, ids.enNew);

    const previous = titleRow(page, TITLES.koNew).getByRole("link", {
      name: ids.koOld,
      exact: true,
    });
    await accessible(previous, page);
    await previous.click();
    await closeDetail(page, ids.koOld);

    const next = titleRow(page, TITLES.koOld).getByRole("link", {
      name: ids.koNew,
      exact: true,
    });
    await accessible(next, page);
    await next.click();
    await closeDetail(page, ids.koNew);

    await titleRow(page, TITLES.enOld).getByRole("combobox").selectOption("open");
    await expectStatus(workspace, ids.enOld, "open");

    await titleRow(page, TITLES.koNew).getByRole("combobox").selectOption("closed");
    await page
      .getByRole("dialog", { name: messages.closeIssue.title, exact: true })
      .getByRole("button", { name: messages.closeIssue.submit, exact: true })
      .click();
    await expectStatus(workspace, ids.koNew, "closed");
  });
});

/** 유효한 결정 둘과, 그 결정으로 대체되어 닫힌 결정 둘을 심습니다. */
async function seedDecisions(workspace: BdWorkspace) {
  const ids = await workspace.createIssues({
    koOld: { title: TITLES.koOld, type: "decision" },
    koNew: { title: TITLES.koNew, type: "decision" },
    enOld: { title: TITLES.enOld, type: "decision" },
    enNew: { title: TITLES.enNew, type: "decision" },
  });
  await workspace.bd("supersede", ids.koOld, "--with", ids.koNew);
  await workspace.bd("supersede", ids.enOld, "--with", ids.enNew);
  return ids;
}

function titleRow(page: Page, title: string) {
  return page
    .getByRole("main")
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: title, exact: true }) });
}

async function closeDetail(page: Page, id: string) {
  const dialog = page.getByRole("dialog", {
    name: messages.issueDetail.dialog(id),
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: messages.common.close, exact: true }).first().click();
  await expect(dialog).toBeHidden();
}

/** 표 안에서 스크롤해 조작이 창 안에 다 들어오는지 확인합니다. */
async function accessible(control: Locator, page: Page) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport({ ratio: 1 });
  const box = (await control.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
}

async function expectStatus(workspace: BdWorkspace, id: string, status: string) {
  await expect
    .poll(async () => (await workspace.showIssue(id)).status, {
      timeout: SAVE_TIMEOUT,
    })
    .toBe(status);
}
