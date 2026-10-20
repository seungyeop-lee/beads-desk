import { expect, test } from "../support/bdWorkspace";

test("라벨 메뉴에서 고른 라벨과 라벨 없음은 주소에 남아 보기 탭 이동에도 유지된다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssues({
    uiReady: { title: "e2e 화면 작업", type: "task", labels: ["ui"] },
    uiDoing: {
      title: "e2e 진행 중인 화면 작업",
      type: "task",
      labels: ["ui"],
      status: "in_progress",
    },
    api: { title: "e2e API 작업", type: "task", labels: ["api", "triage"] },
    plain: { title: "e2e 라벨 없는 작업", type: "task" },
  });
  const tabs = page.getByRole("navigation", { name: "보기" });

  await page.goto("issues");
  await expect(page.getByRole("link", { name: "e2e API 작업" })).toBeVisible();

  const labelMenu = page.locator("summary", { hasText: "라벨" });
  await labelMenu.click();
  await page.getByRole("checkbox", { name: "ui", exact: true }).check();
  await page.getByRole("checkbox", { name: "라벨 없음" }).check();
  // 주소는 화면보다 늦게 바뀌므로, 탭을 누르기 전에 두 선택이 모두 주소에 남을 때까지 기다립니다.
  await expect(page).toHaveURL(/\/issues\?label=ui&label=$/);

  await tabs.getByRole("link", { name: "바로 작업 가능 2" }).click();
  await expect(page).toHaveURL(/\/issues\?view=ready&label=ui&label=$/);
  await expect(labelMenu).toContainText("2개");
  await expect(page.getByRole("link", { name: "e2e 화면 작업", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e 라벨 없는 작업" })).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e API 작업" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "e2e 진행 중인 화면 작업" })).toHaveCount(0);
});
