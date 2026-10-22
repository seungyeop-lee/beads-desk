import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("에픽에서 새 하위 이슈를 만들거나 기존 이슈를 골라 넣으면 bd의 상위 이슈가 그 에픽이 되고, 하위 목록과 진행률에 들어간다", async ({
  page,
  workspace,
}) => {
  const { epic, task } = await workspace.createIssues({
    epic: { title: "하위를 넣을 에픽", type: "epic" },
    task: { title: "넣을 후보 작업", type: "task" },
  });

  await page.goto("epics");
  await page.getByRole("button", { name: "새 하위 이슈" }).click();
  const dialog = page.getByRole("dialog", { name: "새 이슈" });
  await dialog.getByRole("textbox", { name: "제목" }).fill("에픽에서 만든 하위 이슈");
  await dialog.getByRole("button", { name: "만들기" }).click();

  await expect(page).toHaveURL(/[?&]issue=/);
  const created = new URL(page.url()).searchParams.get("issue") ?? "";
  const detail = page.getByRole("dialog", { name: `${created} 이슈` });
  await expect(detail).toBeVisible();
  expect((await workspace.showIssue(created)).parent).toBe(epic);

  await page.keyboard.press("Escape");
  await expect(detail).toBeHidden();
  await expect(page.getByRole("link", { name: "에픽에서 만든 하위 이슈" })).toBeVisible();
  await expect(page.getByLabel(`${epic} 진행률`)).toHaveAttribute("aria-valuemax", "1");

  await page.getByRole("combobox", { name: "기존 이슈를 하위로 넣기" }).fill("넣을 후보");
  await page
    .getByRole("listbox", { name: "기존 이슈를 하위로 넣기" })
    .getByRole("option", { name: new RegExp(task) })
    .click();
  await page.getByRole("button", { name: "하위로 넣기" }).click();

  await expect(page.getByText(`${task}을(를) ${epic}의 하위 이슈로 넣었습니다.`)).toBeVisible();
  await expect(page.getByRole("link", { name: "넣을 후보 작업" })).toBeVisible();
  await expect
    .poll(async () => (await workspace.showIssue(task)).parent, { timeout: SAVE_TIMEOUT })
    .toBe(epic);
});
