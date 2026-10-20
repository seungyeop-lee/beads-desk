import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("상세에서 보류를 고르면 기한과 사유를 묻고, 내일까지 보류하면 보류 탭에 그 기한을 보인다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("e2e 미룰 작업", "--type", "task");

  await page.goto(`issues?issue=${id}`);
  const detail = page.getByRole("dialog", { name: `${id} 이슈`, exact: true });
  await detail.getByLabel("상태", { exact: true }).selectOption("deferred");
  const deferring = page.getByRole("dialog", { name: "이슈 보류" });
  await expect(deferring.getByRole("combobox", { name: "보류 기한" })).toBeFocused();
  await expect(deferring.getByRole("combobox", { name: "보류 기한" })).toHaveValue("tomorrow");
  await deferring.getByRole("textbox", { name: "보류 사유" }).fill("API 열림 대기");
  await deferring.getByRole("button", { name: "보류" }).click();

  await expect
    .poll(async () => (await workspace.showIssue(id)).defer_until, { timeout: SAVE_TIMEOUT })
    .toBeDefined();
  const saved = await workspace.showIssue(id);
  expect(saved.status).toBe("deferred");
  expect(saved.notes).toBe("API 열림 대기");
  const until = Date.parse(saved.defer_until!);
  expect(until - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000);
  const shown = await page.evaluate((ms) => new Date(ms).toLocaleString("ko"), until);
  await expect(detail.getByText(shown)).toBeVisible();

  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation", { name: "보기" })
    .getByRole("link", { name: "보류 1" })
    .click();
  await expect(page.getByRole("row").filter({ hasText: "e2e 미룰 작업" })).toContainText(shown);
});

test("날짜 지정으로 고른 날짜까지 보류하면 bd에 그날 0시가 기한으로 저장된다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("e2e 날짜로 미룰 작업", "--type", "task");

  await page.goto("issues");
  await page.getByRole("combobox", { name: `${id} 상태`, exact: true }).selectOption("deferred");
  const deferring = page.getByRole("dialog", { name: "이슈 보류" });
  await deferring.getByRole("combobox", { name: "보류 기한" }).selectOption("date");
  await deferring.getByLabel("보류할 날짜").fill("2030-01-15");
  await deferring.getByRole("button", { name: "보류" }).click();

  await expect
    .poll(async () => (await workspace.showIssue(id)).defer_until, { timeout: SAVE_TIMEOUT })
    .toBeDefined();
  const saved = await workspace.showIssue(id);
  expect(saved.status).toBe("deferred");
  // bd는 날짜를 bd를 실행한 시간대의 0시로 해석하고, 서버와 시나리오는 같은 컴퓨터에서 실행됩니다.
  expect(Date.parse(saved.defer_until!)).toBe(new Date(2030, 0, 15).getTime());
});

test("보류 이슈를 다시 열면 기한이 지워지고 열림이 되어 보류 탭에서 사라진다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("e2e 보류한 작업", "--type", "task");
  await workspace.bd("defer", id, "--until=+7d");

  await page.goto(`issues?view=deferred&issue=${id}`);
  const detail = page.getByRole("dialog", { name: `${id} 이슈`, exact: true });
  await detail.getByRole("button", { name: "다시 열기" }).click();

  await expect
    .poll(async () => (await workspace.showIssue(id)).status, { timeout: SAVE_TIMEOUT })
    .toBe("open");
  expect((await workspace.showIssue(id)).defer_until).toBeUndefined();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: "e2e 보류한 작업" })).toHaveCount(0);
});

test("기한이 지난 보류 이슈는 목록을 읽을 때 bd가 다시 열고, 그 변경 알림으로 바로 작업 가능 탭에 보인다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("e2e 기한 지난 작업", "--type", "task");
  await workspace.bd("defer", id, "--until=2020-01-01");

  await page.goto("issues?view=ready");

  await expect(page.getByRole("link", { name: "e2e 기한 지난 작업" })).toBeVisible();
  expect((await workspace.showIssue(id)).status).toBe("open");
});
