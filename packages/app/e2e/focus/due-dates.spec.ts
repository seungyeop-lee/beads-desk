import type { Page } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { TIMEOUT_SCALE } from "../support/stress";

// CLI로 바꾼 내용은 새로고침 없이 화면에 오므로, 그 반영을 기다리는 시간을 넉넉히 잡습니다.
const NOTIFY_TIMEOUT = 10_000 * TIMEOUT_SCALE;

/** browser 현지 날짜로 오늘에서 days일 뒤의 날("YYYY-MM-DD")과, 그날 time(HH:mm, 비우면 0시)의 시각(epoch ms)입니다. */
function localDue(page: Page, days: number, time = "") {
  return page.evaluate(
    ([days, time]) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      const [hours = 0, minutes = 0] = time === "" ? [] : time.split(":").map(Number);
      date.setHours(hours, minutes, 0, 0);
      const pad = (value: number) => String(value).padStart(2, "0");
      return {
        day: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
        at: date.getTime(),
      };
    },
    [days, time] as const,
  );
}

test("상세에서 날짜만, 시각까지 정하거나 바꾸거나 지운 마감일이 bd에 그대로 저장되어 지금 화면의 마감 묶음이 따라 바뀌고, CLI로 바꾼 마감일도 새로고침 없이 보이며, 다른 workspace의 마감은 섞이지 않는다", async ({
  page,
  context,
  appServerUrl,
  workspace,
  otherWorkspace,
}) => {
  const id = await workspace.createIssue("마감을 정할 작업");
  await otherWorkspace.createIssue("다른 workspace의 마감 지난 작업", "--due", "2020-01-01");
  const detail = page.getByRole("dialog", { name: `${id} 이슈`, exact: true });
  const dueForm = detail.getByRole("form", { name: "마감일", exact: true });
  const deadlines = page.getByRole("region", { name: "마감", exact: true });
  const group = (name: string) => deadlines.getByRole("region", { name, exact: true });
  const row = deadlines.getByRole("link", { name: `${id} 마감을 정할 작업`, exact: true });
  const savedDueAt = async () => {
    const dueAt = (await workspace.showIssue(id)).due_at;
    return dueAt ? Date.parse(dueAt) : null;
  };
  const editDueAt = async (fields: { day?: string; time?: string }) => {
    await page.goto(`focus?issue=${id}`);
    await detail.getByTitle("마감일 편집").click();
    if (fields.day !== undefined) await dueForm.getByLabel("마감 날짜").fill(fields.day);
    if (fields.time !== undefined) await dueForm.getByLabel("마감 시각").fill(fields.time);
    await dueForm.getByRole("button", { name: "저장", exact: true }).click();
  };

  const dateOnly = await localDue(page, 2);
  await editDueAt({ day: dateOnly.day });
  await expect.poll(savedDueAt, { timeout: SAVE_TIMEOUT }).toBe(dateOnly.at);
  await page.keyboard.press("Escape");
  await expect(group("3일 이내").getByRole("link", { name: /마감을 정할 작업/ })).toBeVisible();

  const timed = await localDue(page, 2, "10:15");
  await editDueAt({ time: "10:15" });
  await expect.poll(savedDueAt, { timeout: SAVE_TIMEOUT }).toBe(timed.at);

  const yesterday = await localDue(page, -1, "10:15");
  await editDueAt({ day: yesterday.day });
  await expect.poll(savedDueAt, { timeout: SAVE_TIMEOUT }).toBe(yesterday.at);
  await page.keyboard.press("Escape");
  await expect(group("기한 초과").getByRole("link", { name: /마감을 정할 작업/ })).toBeVisible();

  await page.goto(`focus?issue=${id}`);
  await detail.getByTitle("마감일 편집").click();
  await dueForm.getByRole("button", { name: "지우기", exact: true }).click();
  await expect.poll(savedDueAt, { timeout: SAVE_TIMEOUT }).toBeNull();
  await page.keyboard.press("Escape");
  await expect(row).toHaveCount(0);

  await workspace.bd("update", id, "--due", "2020-01-01");
  await expect(group("기한 초과").getByRole("link", { name: /마감을 정할 작업/ })).toBeVisible({
    timeout: NOTIFY_TIMEOUT,
  });
  await expect(deadlines.getByRole("link", { name: /다른 workspace/ })).toHaveCount(0);

  const otherPage = await context.newPage();
  await otherPage.goto(`${appServerUrl}/w/${otherWorkspace.slug}/focus`);
  const otherOverdue = otherPage
    .getByRole("region", { name: "마감", exact: true })
    .getByRole("region", { name: "기한 초과", exact: true });
  await expect(
    otherOverdue.getByRole("link", { name: /다른 workspace의 마감 지난 작업/ }),
  ).toBeVisible();
  await expect(otherOverdue.getByRole("link", { name: /마감을 정할 작업/ })).toHaveCount(0);
});
