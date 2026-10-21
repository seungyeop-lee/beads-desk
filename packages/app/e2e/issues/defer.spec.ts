import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("상세에서 사유와 함께 내일까지 보류하면 bd에 저장되어 보류 탭에 그 기한이 보이고, 보류 탭 주소로 연 상세에서 다시 열면 기한이 지워지며, 표에서 날짜를 지정해 다시 보류할 수 있다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("e2e 미룰 작업", "--type", "task");
  const deferring = page.getByRole("dialog", { name: "이슈 보류" });

  await page.goto(`issues?issue=${id}`);
  const detail = page.getByRole("dialog", { name: `${id} 이슈`, exact: true });
  await detail.getByLabel("상태", { exact: true }).selectOption("deferred");
  await deferring.getByRole("textbox", { name: "보류 사유" }).fill("API 열림 대기");
  await deferring.getByRole("button", { name: "보류" }).click();

  await expect
    .poll(async () => (await workspace.showIssue(id)).defer_until, { timeout: SAVE_TIMEOUT })
    .toBeDefined();
  const saved = await workspace.showIssue(id);
  expect(saved.status).toBe("deferred");
  expect(saved.notes).toBe("API 열림 대기");
  const shown = await page.evaluate(
    (until) => new Date(until).toLocaleString("ko"),
    saved.defer_until!,
  );
  await expect(detail.getByText(shown)).toBeVisible();

  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation", { name: "보기" })
    .getByRole("link", { name: /^보류/ })
    .click();
  await expect(page.getByRole("row").filter({ hasText: "e2e 미룰 작업" })).toContainText(shown);

  await page.goto(`issues?view=deferred&issue=${id}`);
  await detail.getByRole("button", { name: "다시 열기" }).click();
  await expect
    .poll(async () => (await workspace.showIssue(id)).status, { timeout: SAVE_TIMEOUT })
    .toBe("open");
  expect((await workspace.showIssue(id)).defer_until).toBeUndefined();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: "e2e 미룰 작업" })).toHaveCount(0);

  await page.goto("issues");
  await page.getByRole("combobox", { name: `${id} 상태`, exact: true }).selectOption("deferred");
  await deferring.getByRole("combobox", { name: "보류 기한" }).selectOption("date");
  await deferring.getByLabel("보류할 날짜").fill("2030-01-15");
  await deferring.getByRole("button", { name: "보류" }).click();
  await expect
    .poll(async () => (await workspace.showIssue(id)).defer_until, { timeout: SAVE_TIMEOUT })
    .toBeDefined();
  expect((await workspace.showIssue(id)).status).toBe("deferred");
});

test("기한이 지난 보류 이슈는 목록을 읽을 때 bd가 다시 열고, 그 변경 알림으로 바로 작업 가능 탭에 보인다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("e2e 기한 지난 작업", "--type", "task");
  await workspace.bd("defer", id, "--until=2020-01-01");

  await page.goto("issues?view=ready");

  await expect(page.getByRole("link", { name: "e2e 기한 지난 작업" })).toBeVisible();
});
