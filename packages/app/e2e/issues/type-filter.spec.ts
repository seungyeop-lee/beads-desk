import { expect, test } from "../support/bdWorkspace";

test("이슈 표는 처음에 결정을 빼고 보이고, 유형 메뉴에서 결정을 고르면 결정도 보인다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssues({
    decision: { title: "e2e 결정", type: "decision" },
    task: { title: "e2e 작업", type: "task" },
  });

  await page.goto("/issues");
  await expect(page.getByRole("link", { name: "e2e 작업" })).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e 결정" })).toHaveCount(0);

  const typeMenu = page.locator("summary", { hasText: "유형" });
  await expect(typeMenu).toContainText("8개");
  await typeMenu.click();
  await expect(page.getByRole("checkbox", { name: "작업" })).toBeChecked();
  await page.getByRole("checkbox", { name: "결정" }).check();

  await expect(page.getByRole("link", { name: "e2e 결정" })).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e 작업" })).toBeVisible();
});

test("기본 선택에서 빠진 결정도 주소로 상세를 열 수 있다", async ({ page, workspace }) => {
  const decision = await workspace.createIssue("e2e 결정", "--type", "decision");

  await page.goto(`/issues?issue=${decision}`);
  await expect(page.getByRole("dialog", { name: `${decision} 이슈` })).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e 결정" })).toHaveCount(0);
});
