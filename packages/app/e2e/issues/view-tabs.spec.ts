import { expect, test } from "../support/bdWorkspace";

test("보기 탭으로 작업 상태 하나를 골라 보고, 고른 탭은 주소에 남아 새로고침, 뒤로 가기, 상세 열고 닫기에도 유지된다", async ({
  page,
  workspace,
}) => {
  const { waiting } = await workspace.createIssues(
    {
      doing: { title: "진행하는 작업", type: "task", status: "in_progress" },
      blocker: { title: "선행 작업", type: "task" },
      waiting: { title: "기다리는 작업", type: "task" },
      later: { title: "미룬 작업", type: "task", status: "deferred" },
      done: { title: "끝난 작업", type: "task", status: "closed" },
    },
    [
      ["waiting", "blocker"],
      ["later", "blocker"],
    ],
  );

  await page.goto("issues");
  const tabs = page.getByRole("navigation", { name: "보기" });
  await expect(tabs.getByRole("link", { name: "전체 5" })).toHaveAttribute("aria-current", "page");

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
