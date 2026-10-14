import { expect, test } from "../support/bdWorkspace";

test("보기 탭으로 작업 상태 하나를 골라 보고, 고른 탭은 주소에 남아 새로고침, 뒤로 가기, 상세 열고 닫기에도 유지된다", async ({
  page,
  workspace,
}) => {
  const doing = await workspace.createIssue("진행하는 작업", "--type", "task");
  await workspace.bd("update", doing, "--status", "in_progress");
  const blocker = await workspace.createIssue("선행 작업", "--type", "task");
  const waiting = await workspace.createIssue("기다리는 작업", "--type", "task");
  await workspace.bd("dep", "add", waiting, blocker);
  const done = await workspace.createIssue("끝난 작업", "--type", "task");
  await workspace.bd("close", done);

  await page.goto("/issues");
  const tabs = page.getByRole("navigation", { name: "보기" });
  await expect(tabs.getByRole("link", { name: "전체 4" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("region", { name: "막힘" })).toContainText("기다리는 작업");
  await expect(page.getByRole("button", { name: "닫힘 묶음 펼치기" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.getByRole("link", { name: "끝난 작업" })).toHaveCount(0);

  await tabs.getByRole("link", { name: "막힘 1" }).click();
  await expect(page).toHaveURL(/\/issues\?view=blocked$/);
  await expect(tabs.getByRole("link", { name: "막힘 1" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "기다리는 작업" })).toBeVisible();
  await expect(page.getByRole("link", { name: "진행하는 작업" })).toHaveCount(0);

  await page.reload();
  await expect(tabs.getByRole("link", { name: "막힘 1" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: "기다리는 작업" }).click();
  await expect(page.getByRole("dialog", { name: `${waiting} 이슈` })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`view=blocked&issue=${waiting}$`));
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/issues\?view=blocked$/);
  await expect(page.getByRole("link", { name: "기다리는 작업" })).toBeVisible();

  await tabs.getByRole("link", { name: "닫힘 1" }).click();
  await expect(page.getByRole("link", { name: "끝난 작업" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/issues\?view=blocked$/);
  await expect(tabs.getByRole("link", { name: "막힘 1" })).toHaveAttribute("aria-current", "page");
});

test("유형과 검색은 고른 보기 탭 안에서 결과와 탭의 개수를 함께 줄인다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssue("로그인 버그", "--type", "bug");
  await workspace.createIssue("로그인 작업", "--type", "task");
  await workspace.createIssue("가입 작업", "--type", "task");

  await page.goto("/issues?view=ready");
  const tabs = page.getByRole("navigation", { name: "보기" });
  await expect(tabs.getByRole("link", { name: "바로 작업 가능 3" })).toBeVisible();

  await page.getByRole("searchbox", { name: "검색" }).fill("로그인");
  await expect(tabs.getByRole("link", { name: "바로 작업 가능 2" })).toBeVisible();
  await expect(page.getByRole("link", { name: "가입 작업" })).toHaveCount(0);

  await page.locator("summary", { hasText: "유형" }).click();
  await page.getByRole("checkbox", { name: "버그" }).uncheck();
  await expect(tabs.getByRole("link", { name: "바로 작업 가능 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: "로그인 작업" })).toBeVisible();
  await expect(page.getByRole("link", { name: "로그인 버그" })).toHaveCount(0);
});
