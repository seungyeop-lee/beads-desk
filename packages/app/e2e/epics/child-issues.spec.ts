import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("에픽의 새 하위 이슈로 만든 이슈는 하위 목록과 진행률에 들어가고 상세가 열린다", async ({
  page,
  workspace,
}) => {
  const epic = await workspace.createIssue("하위를 만들 에픽", "--type", "epic");

  await page.goto("/epics");
  await page.getByRole("button", { name: "새 하위 이슈" }).click();
  const dialog = page.getByRole("dialog", { name: "새 이슈" });
  await expect(dialog.getByText("하위를 만들 에픽")).toBeVisible();
  await dialog.getByRole("textbox", { name: "제목" }).fill("에픽에서 만든 하위 이슈");
  await dialog.getByRole("button", { name: "만들기" }).click();

  await expect(page).toHaveURL(/[?&]issue=/);
  const created = new URL(page.url()).searchParams.get("issue") ?? "";
  await expect(page.getByRole("dialog", { name: `${created} 이슈` })).toBeVisible();
  expect((await workspace.showIssue(created)).parent).toBe(epic);

  await page.goto("/epics");
  await expect(page.getByRole("link", { name: "에픽에서 만든 하위 이슈" })).toBeVisible();
  await expect(page.getByLabel(`${epic} 진행률`)).toHaveAttribute("max", "1");
});

test("에픽에서 기존 이슈를 찾아 하위로 넣으면 하위 목록에 들어가고, 다른 에픽은 후보에 없다", async ({
  page,
  workspace,
}) => {
  const epic = await workspace.createIssue("넣을 곳 에픽", "--type", "epic");
  await workspace.createIssue("넣을 후보 다른 에픽", "--type", "epic");
  const task = await workspace.createIssue("넣을 후보 작업", "--type", "task");

  await page.goto("/epics");
  const search = page.getByRole("combobox", { name: "기존 이슈를 하위로 넣기" });
  await search.fill("넣을");
  const candidates = page.getByRole("listbox", { name: "기존 이슈를 하위로 넣기" });
  await expect(candidates.getByRole("option")).toHaveCount(1);
  await candidates.getByRole("option", { name: new RegExp(task) }).click();

  await expect(page.getByText(`${task}을(를) ${epic}의 하위 이슈로 넣었습니다.`)).toBeVisible();
  await expect(page.getByRole("link", { name: "넣을 후보 작업" })).toBeVisible();
  await expect
    .poll(async () => (await workspace.showIssue(task)).parent, { timeout: SAVE_TIMEOUT })
    .toBe(epic);
});
