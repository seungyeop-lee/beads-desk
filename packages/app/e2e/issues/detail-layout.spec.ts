import type { Locator, Page } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

const BODY_TEXT = "주 이슈 본문";

for (const width of [2560, 1220]) {
  test(`너비 ${width}px에서 옆 패널이 없으면 상태가 본문 오른쪽 열에 있다`, async ({
    page,
    workspace,
  }) => {
    const { main } = await seed(workspace);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/issues?issue=${main}`);

    const { status, body } = detailParts(page, main);
    const [statusBox, bodyBox] = await boxes(status, body);
    expect(statusBox.x).toBeGreaterThanOrEqual(bodyBox.x + bodyBox.width);
    await expectSingleFields(page);
  });
}

test("옆 패널 때문에 주 상세가 좁아지면 핵심 속성은 본문 위로, 라벨은 본문 아래로 내려가고 그대로 편집된다", async ({
  page,
  workspace,
}) => {
  const { main, dependency, extra } = await seed(workspace);
  await page.setViewportSize({ width: 1220, height: 1000 });
  await page.goto(`/issues?issue=${main}&side=${dependency}`);

  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  const { status, body } = detailParts(page, main);
  const labelInput = dialog.getByRole("textbox", { name: "추가할 라벨" });
  const [statusBox, bodyBox, labelBox] = await boxes(status, body, labelInput);
  expect(statusBox.y + statusBox.height).toBeLessThanOrEqual(bodyBox.y);
  expect(statusBox.x).toBeLessThan(bodyBox.x + bodyBox.width);
  expect(labelBox.y).toBeGreaterThanOrEqual(bodyBox.y + bodyBox.height);
  await expectSingleFields(page);

  await status.selectOption("in_progress");
  await expect
    .poll(async () => (await workspace.showIssue(main)).status, { timeout: SAVE_TIMEOUT })
    .toBe("in_progress");

  await dialog.getByLabel("우선순위", { exact: true }).selectOption("1");
  await expect
    .poll(async () => (await workspace.showIssue(main)).priority, { timeout: SAVE_TIMEOUT })
    .toBe(1);

  await dialog.getByTitle("담당자 고치기").click();
  await dialog.getByRole("textbox", { name: "담당자" }).fill("e2e 담당자");
  await dialog.getByRole("textbox", { name: "담당자" }).press("Enter");
  await expect
    .poll(async () => (await workspace.showIssue(main)).assignee, { timeout: SAVE_TIMEOUT })
    .toBe("e2e 담당자");

  await labelInput.fill("e2e-라벨");
  await dialog.getByRole("button", { name: "라벨 추가" }).click();
  await expect
    .poll(async () => (await workspace.showIssue(main)).labels, { timeout: SAVE_TIMEOUT })
    .toEqual(["e2e-라벨"]);

  await dialog.getByRole("combobox", { name: "연결할 이슈 찾기" }).fill("추가할 선행");
  await dialog
    .getByRole("listbox", { name: "연결할 이슈 찾기" })
    .getByRole("option", { name: new RegExp(extra) })
    .click();
  await expect
    .poll(async () => (await workspace.showIssue(main)).dependencies?.map(({ id }) => id).sort(), {
      timeout: SAVE_TIMEOUT,
    })
    .toEqual([dependency, extra].sort());
});

async function seed(workspace: BdWorkspace) {
  const main = await workspace.createIssue("주 이슈", "--type", "task", "--description", BODY_TEXT);
  const dependency = await workspace.createIssue("선행 이슈", "--type", "task");
  const extra = await workspace.createIssue("추가할 선행 이슈", "--type", "task");
  await workspace.bd("dep", "add", main, dependency);
  return { main, dependency, extra };
}

function detailParts(page: Page, id: string) {
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  return {
    status: dialog.getByLabel("상태", { exact: true }),
    body: dialog.getByText(BODY_TEXT, { exact: true }),
  };
}

async function boxes(...locators: Locator[]) {
  return Promise.all(
    locators.map(async (locator) => {
      await expect(locator).toBeVisible();
      const box = await locator.boundingBox();
      if (!box) throw new Error(`${locator}의 위치를 읽지 못했습니다.`);
      return box;
    }),
  );
}

/** 배치를 바꿔도 상태와 우선순위 입력이 하나씩만 그려져야 label이 가리키는 대상이 하나로 정해집니다. */
async function expectSingleFields(page: Page) {
  await expect(page.locator("#issue-status")).toHaveCount(1);
  await expect(page.locator("#issue-priority")).toHaveCount(1);
}
