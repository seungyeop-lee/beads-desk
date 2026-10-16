import { expect, test } from "../support/bdWorkspace";

// 브라우저도 같은 컴퓨터의 시간대를 쓰므로, 화면이 보는 오늘과 같은 날짜입니다.
function localDay(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

test("필터 줄에서 날짜 기준과 기간을 바꾸면 목록과 탭 개수가 바뀌고, 주소와 보기 탭 링크에 남는다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssues({
    done: { title: "오늘 끝낸 작업", type: "task", status: "closed" },
    open: { title: "열린 작업", type: "task" },
  });
  const today = localDay();
  const tabs = page.getByRole("navigation", { name: "보기" });

  await page.goto("/issues");
  await expect(tabs.getByRole("link", { name: "전체 2" })).toBeVisible();

  await page.getByRole("combobox", { name: "날짜 기준" }).selectOption({ label: "닫은 날" });
  await expect(page).toHaveURL(/\/issues\?date=closed$/);
  await page.getByLabel("시작일").fill(today);
  await expect(page).toHaveURL(new RegExp(`/issues\\?date=closed&from=${today}$`));
  await expect(tabs.getByRole("link", { name: "전체 1" })).toBeVisible();
  await expect(page.getByRole("link", { name: "열린 작업" })).toHaveCount(0);

  await tabs.getByRole("link", { name: "닫힘 1" }).click();
  await expect(page).toHaveURL(new RegExp(`view=closed&date=closed&from=${today}$`));
  await expect(page.getByRole("link", { name: "오늘 끝낸 작업" })).toBeVisible();

  await page.getByLabel("시작일").fill(localDay(1));
  await expect(tabs.getByRole("link", { name: "닫힘 0" })).toBeVisible();

  await page.getByRole("button", { name: "날짜 지우기" }).click();
  await expect(page).toHaveURL(/\/issues\?view=closed&date=closed$/);
  await expect(tabs.getByRole("link", { name: "전체 2" })).toBeVisible();
});
