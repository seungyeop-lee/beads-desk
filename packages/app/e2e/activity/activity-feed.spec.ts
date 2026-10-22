import { expect, test } from "../support/bdWorkspace";
import { localDay } from "../support/localDate";
import { TIMEOUT_SCALE } from "../support/stress";

// CLI로 바꾼 내용은 새로고침 없이 화면에 오므로, 그 반영을 기다리는 시간을 넉넉히 잡습니다.
const NOTIFY_TIMEOUT = 10_000 * TIMEOUT_SCALE;

test("활동 화면은 기록을 한 쪽씩 더 읽고, 날짜 범위를 주소에 남기며, 줄을 누르면 상세를 열고 CLI로 단 댓글과 events journal을 켠 뒤의 수정을 새로고침 없이 보인다", async ({
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

  const journalGuide = page.getByText("bd config set events-journal true");

  await page.goto("activity");
  await expect(page.getByRole("link", { name: "활동", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(journalGuide).toBeVisible();
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

  // journal을 켜기 전에 만든 이슈라 첫 수정은 비교할 앞 레코드가 없어, 바뀐 필드 없이 수정한 사실만 보입니다.
  await workspace.bd("config", "set", "events-journal", "true");
  await workspace.bd("update", firstId, "--title", "고친 작업 0");
  await expect(feed.getByText("수정함")).toHaveCount(1, { timeout: NOTIFY_TIMEOUT });
  await expect(journalGuide).toHaveCount(0);
  await workspace.bd("reopen", firstId);
  await expect(feed.getByText("상태: 닫힘 → 열림")).toBeVisible({ timeout: NOTIFY_TIMEOUT });
  // bd는 설명 수정과 라벨 추가를 한 명령으로 받아도 journal 레코드를 따로 남기므로 수정 기록도 두 줄입니다.
  await workspace.bd("update", firstId, "--description", "고친 설명", "--add-label", "ui");
  await expect(feed.getByText("설명 내용을 고쳤습니다.")).toBeVisible({ timeout: NOTIFY_TIMEOUT });
  await expect(feed.getByText("라벨: 없음 → ui")).toBeVisible();
  await expect(feed.getByText("수정함")).toHaveCount(4);
});
