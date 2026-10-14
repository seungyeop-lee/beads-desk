import { expect, test } from "../support/bdWorkspace";

test("심은 이슈가 이슈 표에 보이고, 제목을 누르면 상세 dialog가 열린다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("e2e로 심은 이슈", "--type", "task");

  await page.goto("/issues");
  await page.getByRole("link", { name: "e2e로 심은 이슈" }).click();

  await expect(page).toHaveURL(new RegExp(`[?&]issue=${id}`));
  await expect(page.getByRole("dialog", { name: `${id} 이슈` })).toBeVisible();
});
