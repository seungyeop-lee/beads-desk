import type { Locator, Page } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

const ALL_STATUSES = ["열림", "진행 중", "막힘", "보류", "닫힘"];

test("결정의 상태 select에는 결정 탭, 이슈 표, 상세 dialog 모두 열림과 닫힘만 있다", async ({
  page,
  workspace,
}) => {
  const decision = await workspace.createIssue("e2e 결정", "--type", "decision");
  const task = await workspace.createIssue("e2e 작업", "--type", "task");

  await page.goto("/decisions");
  await expect(rowStatus(page, decision).locator("option")).toHaveText(["열림", "닫힘"]);

  await page.goto("/issues");
  await expect(rowStatus(page, decision).locator("option")).toHaveText(["열림", "닫힘"]);
  await expect(rowStatus(page, task).locator("option")).toHaveText(ALL_STATUSES);

  await page.getByRole("link", { name: "e2e 결정" }).click();
  await expect(detailStatus(page, decision).locator("option")).toHaveText(["열림", "닫힘"]);
});

test("CLI로 보류한 결정은 세 화면 모두 보류로 보이고, 화면에서 열림으로 되돌릴 수 있다", async ({
  page,
  workspace,
}) => {
  const decision = await workspace.createIssue("e2e 결정", "--type", "decision");
  const screens: [string, (page: Page) => Locator][] = [
    ["/decisions", (page) => rowStatus(page, decision)],
    ["/issues", (page) => rowStatus(page, decision)],
    [`/issues?issue=${decision}`, (page) => detailStatus(page, decision)],
  ];

  for (const [path, statusSelect] of screens) {
    await workspace.bd("update", decision, "--status", "deferred");
    await page.goto(path);
    const select = statusSelect(page);
    await expect(select).toHaveValue("deferred");
    await expect(select.locator("option")).toHaveText(["보류", "열림", "닫힘"]);

    await select.selectOption("open");
    await expectStatus(workspace, decision, "open");
  }
});

test("닫기를 bd가 거부한 결정은 확인 창에서 거절하면 그대로 두고, 수락하면 강제로 닫는다", async ({
  page,
  workspace,
}) => {
  const decision = await workspace.createIssue("e2e 결정", "--type", "decision");
  const blocker = await workspace.createIssue("e2e 선행 작업", "--type", "task");
  await workspace.bd("dep", "add", decision, blocker);

  await page.goto("/decisions");
  const select = rowStatus(page, decision);

  const rejected = page.waitForEvent("dialog");
  await select.selectOption("closed");
  const rejectedConfirm = await rejected;
  expect(rejectedConfirm.message()).toContain("그래도 닫을까요?");
  await rejectedConfirm.dismiss();
  await expect(select).toHaveValue("open");
  await expectStatus(workspace, decision, "open");

  const accepted = page.waitForEvent("dialog");
  await select.selectOption("closed");
  await (await accepted).accept();
  await expectStatus(workspace, decision, "closed");
  await expect(rowStatus(page, decision)).toHaveValue("closed");
});

function rowStatus(page: Page, id: string) {
  return page.getByRole("combobox", { name: `${id} 상태`, exact: true });
}

function detailStatus(page: Page, id: string) {
  return page.getByRole("dialog", { name: `${id} 이슈` }).getByLabel("상태", { exact: true });
}

async function expectStatus(workspace: BdWorkspace, id: string, status: string) {
  await expect
    .poll(async () => (await workspace.showIssue(id)).status, { timeout: SAVE_TIMEOUT })
    .toBe(status);
}
