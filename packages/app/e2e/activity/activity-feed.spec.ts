import { expect, test } from "../support/bdWorkspace";
import { TIMEOUT_SCALE } from "../support/stress";

// CLI로 바꾼 내용은 새로고침 없이 화면에 오므로, 그 반영을 기다리는 시간을 넉넉히 잡습니다.
const NOTIFY_TIMEOUT = 10_000 * TIMEOUT_SCALE;

// 브라우저도 같은 컴퓨터의 시간대를 쓰므로, 화면이 보는 오늘과 같은 날짜입니다.
function localDay(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

test("활동 화면은 기록을 한 쪽씩 더 읽고, 날짜 범위를 주소에 남기며, 줄을 누르면 상세를 열고 CLI로 단 댓글을 새로고침 없이 보인다", async ({
  page,
  workspace,
}) => {
  // 닫힌 이슈 하나가 만든 기록과 닫은 기록을 남기므로, 26개를 심어 한 쪽(50건)보다 2건 많게 합니다.
  const seeds = Object.fromEntries(
    Array.from({ length: 26 }, (_, index) => [
      `done${index}`,
      { title: `끝낸 작업 ${index}`, type: "task", status: "closed" },
    ]),
  );
  const ids = await workspace.createIssues(seeds);
  const firstId = ids.done0!;
  const feed = page.getByRole("list", { name: "활동 기록" });
  const records = feed.getByRole("link");
  const showMore = page.getByRole("button", { name: "더 보기" });

  await page.goto("activity");
  await expect(page.getByRole("link", { name: "활동", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(records).toHaveCount(50);
  await showMore.click();
  await expect(records).toHaveCount(52);
  await expect(showMore).toHaveCount(0);

  await page.getByLabel("시작일").fill(localDay(1));
  await expect(page).toHaveURL(new RegExp(`/activity\\?from=${localDay(1)}$`));
  await expect(page.getByText("고른 기간에 남은 기록이 없습니다.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("시작일")).toHaveValue(localDay(1));
  await expect(page.getByText("고른 기간에 남은 기록이 없습니다.")).toBeVisible();
  await page.getByLabel("시작일").fill(localDay());
  await page.getByLabel("종료일").fill(localDay());
  await expect(page).toHaveURL(new RegExp(`/activity\\?from=${localDay()}&to=${localDay()}$`));
  await expect(records).toHaveCount(50);

  await feed
    .getByRole("link", { name: `${firstId} 끝낸 작업 0`, exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog", { name: `${firstId} 이슈` })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await workspace.bd("comments", "add", firstId, "CLI에서 남긴 확인 댓글");
  await expect(feed.getByText("CLI에서 남긴 확인 댓글")).toBeVisible({ timeout: NOTIFY_TIMEOUT });
});
