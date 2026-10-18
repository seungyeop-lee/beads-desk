import type { Page } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test, type BdWorkspace } from "../support/bdWorkspace";

test("CLI로 보류한 결정은 보류로 보이고, 화면에서 열림으로 되돌릴 수 있다", async ({
  page,
  workspace,
}) => {
  const decision = await workspace.createIssue("e2e 결정", "--type", "decision");
  await workspace.bd("update", decision, "--status", "deferred");

  await page.goto("/decisions");
  const select = rowStatus(page, decision);
  await expect(select).toHaveValue("deferred");

  await select.selectOption("open");
  await expectStatus(workspace, decision, "open");
});

test("닫기를 bd가 거부한 결정은 확인 창에서 거절하면 그대로 두고, 수락하면 강제로 닫는다", async ({
  page,
  workspace,
}) => {
  const { decision } = await workspace.createIssues(
    {
      decision: { title: "e2e 결정", type: "decision" },
      blocker: { title: "e2e 선행 작업", type: "task" },
    },
    [["decision", "blocker"]],
  );

  await page.goto("/decisions");
  const select = rowStatus(page, decision);

  const rejected = page.waitForEvent("dialog");
  await select.selectOption("closed");
  await submitCloseReason(page);
  const rejectedConfirm = await rejected;
  expect(rejectedConfirm.message()).toContain("그래도 닫을까요?");
  await rejectedConfirm.dismiss();
  await expect(select).toHaveValue("open");
  await expectStatus(workspace, decision, "open");

  const accepted = page.waitForEvent("dialog");
  await select.selectOption("closed");
  await submitCloseReason(page);
  await (await accepted).accept();
  await expectStatus(workspace, decision, "closed");
  await expect(rowStatus(page, decision)).toHaveValue("closed");
});

/** 닫힘을 고르면 먼저 닫는 사유를 묻습니다. 사유 없이 닫기를 요청합니다. */
async function submitCloseReason(page: Page) {
  await page
    .getByRole("dialog", { name: "이슈 닫기" })
    .getByRole("button", { name: "이슈 닫기" })
    .click();
}

function rowStatus(page: Page, id: string) {
  return page.getByRole("combobox", { name: `${id} 상태`, exact: true });
}

async function expectStatus(workspace: BdWorkspace, id: string, status: string) {
  await expect
    .poll(async () => (await workspace.showIssue(id)).status, { timeout: SAVE_TIMEOUT })
    .toBe(status);
}
