import { expect, test } from "../support/bdWorkspace";

test("유형 메뉴에서 고른 유형은 주소에 남아 새로고침과 보기 탭 이동에도 유지된다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssues({
    decision: { title: "e2e 결정", type: "decision" },
    bug: { title: "e2e 버그", type: "bug" },
    task: { title: "e2e 작업", type: "task" },
  });

  await page.goto("issues");
  await expect(page.getByRole("link", { name: "e2e 작업" })).toBeVisible();

  await page.locator("summary", { hasText: "유형" }).click();
  await page.getByRole("checkbox", { name: "결정" }).check();
  await page.getByRole("checkbox", { name: "버그" }).uncheck();
  // 주소는 화면보다 늦게 바뀌므로, 새로고침하기 전에 결정을 고른 주소가 아니라 버그까지 뺀 주소가 될 때까지 기다립니다.
  await expect(page).toHaveURL(/\/issues\?type=.*decision/);
  await expect(page).not.toHaveURL(/type=bug/);

  await page.reload();
  await expect(page.getByRole("link", { name: "e2e 작업" })).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e 결정" })).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e 버그" })).toHaveCount(0);

  await page
    .getByRole("navigation", { name: "보기" })
    .getByRole("link", { name: /^바로 작업 가능/ })
    .click();
  await expect(page).toHaveURL(/\/issues\?view=ready&type=/);
});
