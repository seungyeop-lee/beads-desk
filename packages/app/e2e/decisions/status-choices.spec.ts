import type { Page } from "@playwright/test";
import { expect, expectStatus, test } from "../support/bdWorkspace";

test("보류로 저장된 결정은 보류로 보이고 화면에서 열림으로 되돌리며, 닫기를 bd가 거부한 결정은 확인 창에서 거절하면 그대로 두고 수락하면 강제로 닫는다", async ({
  page,
  workspace,
}) => {
  const { deferred, decision } = await workspace.createIssues(
    {
      deferred: { title: "e2e 보류한 결정", type: "decision", status: "deferred" },
      decision: { title: "e2e 결정", type: "decision" },
      blocker: { title: "e2e 선행 작업", type: "task" },
    },
    [["decision", "blocker"]],
  );

  await page.goto("decisions");
  const deferredSelect = rowStatus(page, deferred);
  await expect(deferredSelect).toHaveValue("deferred");
  await deferredSelect.selectOption("open");
  await expectStatus(workspace, deferred, "open");

  const select = rowStatus(page, decision);
  const rejected = page.waitForEvent("dialog");
  await select.selectOption("closed");
  await submitCloseReason(page);
  await (await rejected).dismiss();
  await expectStatus(workspace, decision, "open");
  // 상태 칸이 열림으로 돌아온 뒤에 닫힘을 다시 골라야 새로 고른 것으로 처리됩니다.
  await expect(select).toHaveValue("open");

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
