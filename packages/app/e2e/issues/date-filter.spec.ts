import { expect, test } from "../support/bdWorkspace";
import { localDay } from "../support/localDate";

test("필터 줄에서 고른 날짜 기준과 기간은 주소에 남고, 보기 탭 링크로 옮겨도 이어진다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssues({
    done: { title: "오늘 끝낸 작업", type: "task", status: "closed" },
    open: { title: "열린 작업", type: "task" },
  });
  const today = localDay();

  await page.goto("issues");
  await expect(page.getByRole("link", { name: "열린 작업" })).toBeVisible();

  await page.getByRole("combobox", { name: "날짜 기준" }).selectOption({ label: "닫은 날" });
  await expect(page).toHaveURL(/\/issues\?date=closed$/);
  await page.getByLabel("시작일").fill(today);
  await expect(page).toHaveURL(new RegExp(`/issues\\?date=closed&from=${today}$`));

  await page
    .getByRole("navigation", { name: "보기" })
    .getByRole("link", { name: /^닫힘/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`view=closed&date=closed&from=${today}$`));
  await expect(page.getByRole("link", { name: "오늘 끝낸 작업" })).toBeVisible();

  await page.getByRole("button", { name: "날짜 지우기" }).click();
  await expect(page).toHaveURL(/\/issues\?view=closed&date=closed$/);
});
