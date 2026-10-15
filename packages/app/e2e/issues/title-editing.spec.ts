import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("이슈 목록과 에픽 화면의 표에서는 제목을 고칠 수 없고, 제목을 누르면 상세가 열린다", async ({
  page,
  workspace,
}) => {
  const { task } = await workspace.createIssues({
    epic: { title: "제목 검사 에픽", type: "epic" },
    task: { title: "제목 검사 작업", type: "task", parent: "epic" },
  });

  for (const path of ["/issues", "/epics"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "제목 검사 작업" })).toBeVisible();
    await expect(page.getByRole("button", { name: `${task} 제목 편집` })).toHaveCount(0);
  }

  await page.getByRole("link", { name: "제목 검사 작업" }).click();
  await expect(page.getByRole("dialog", { name: `${task} 이슈` })).toBeVisible();
});

test("상세에서 고친 제목은 bd에 저장된다", async ({ page, workspace }) => {
  const task = await workspace.createIssue("고치기 전 제목");

  await page.goto(`/issues?issue=${task}`);
  const dialog = page.getByRole("dialog", { name: `${task} 이슈` });
  await dialog.getByTitle("제목 편집").click();
  const input = dialog.getByRole("textbox", { name: "제목" });
  await input.fill("고친 뒤 제목");
  await input.press("Enter");

  await expect
    .poll(async () => (await workspace.showIssue(task)).title, { timeout: SAVE_TIMEOUT })
    .toBe("고친 뒤 제목");
});
