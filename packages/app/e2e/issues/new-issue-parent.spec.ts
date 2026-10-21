import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("새 이슈 대화상자에서 찾아 고른 상위 이슈의 하위로 이슈가 만들어지고, 만든 이슈의 상세가 열린다", async ({
  page,
  workspace,
}) => {
  const epic = await workspace.createIssue("상위로 고를 에픽", "--type", "epic");

  await page.goto("issues");
  await page.getByRole("button", { name: "새 이슈" }).click();
  const dialog = page.getByRole("dialog", { name: "새 이슈" });
  await dialog.getByRole("textbox", { name: "제목" }).fill("상위가 있는 새 이슈");
  await dialog.getByRole("combobox", { name: "상위 이슈 찾기" }).fill("상위로");
  await dialog
    .getByRole("listbox", { name: "상위 이슈 찾기" })
    .getByRole("option", { name: new RegExp(epic) })
    .click();
  await dialog.getByRole("button", { name: "만들기" }).click();

  await expect(page).toHaveURL(/[?&]issue=/);
  const created = new URL(page.url()).searchParams.get("issue") ?? "";
  await expect(page.getByRole("dialog", { name: `${created} 이슈` })).toBeVisible();
  await expect
    .poll(async () => (await workspace.showIssue(created)).parent, { timeout: SAVE_TIMEOUT })
    .toBe(epic);
});
