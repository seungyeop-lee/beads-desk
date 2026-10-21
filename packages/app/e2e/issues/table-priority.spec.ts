import { koMessages as messages } from "../../src/client/modules/locale/domain/koMessages";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { titleRow } from "../support/tableRows";

test("이슈 표에서 제목으로 상세를 열고 닫은 뒤, 표에서 바꾼 우선순위가 bd에 저장된다", async ({
  page,
  workspace,
}) => {
  const { opened, edited } = await workspace.createIssues({
    opened: { title: "상세를 열 작업", type: "task" },
    edited: { title: "우선순위를 바꿀 작업", type: "feature", priority: 2 },
  });
  await page.goto("issues");

  await titleRow(page, "상세를 열 작업")
    .getByRole("link", { name: "상세를 열 작업", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: messages.issueDetail.dialog(opened) });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: messages.common.close, exact: true }).first().click();
  await expect(dialog).toBeHidden();

  await titleRow(page, "우선순위를 바꿀 작업")
    .getByRole("combobox", { name: messages.issueTable.priorityOf(edited) })
    .selectOption("0");
  await expect
    .poll(async () => (await workspace.showIssue(edited)).priority, { timeout: SAVE_TIMEOUT })
    .toBe(0);
});
