import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("에픽의 새 하위 이슈는 상위 에픽을 바꿀 수 없고, 만든 이슈는 하위 목록과 진행률에 들어가고 상세가 열린다", async ({
  page,
  workspace,
}) => {
  const epic = await workspace.createIssue("하위를 만들 에픽", "--type", "epic");

  await page.goto("/epics");
  await page.getByRole("button", { name: "새 하위 이슈" }).click();
  const dialog = page.getByRole("dialog", { name: "새 이슈" });
  await expect(dialog.getByText("하위를 만들 에픽")).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "제목" })).toBeFocused();
  await expect(dialog.getByRole("button", { name: "상위 이슈 지우기" })).toHaveCount(0);
  await expect(dialog.getByRole("combobox", { name: "상위 이슈 찾기" })).toHaveCount(0);
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

test("에픽에서 기존 이슈를 골라 확인하면 하위 목록에 들어가고, 확인 전에 취소하면 남지 않는다", async ({
  page,
  workspace,
}) => {
  const { epic, task } = await workspace.createIssues({
    epic: { title: "넣을 곳 에픽", type: "epic" },
    task: { title: "넣을 후보 작업", type: "task" },
  });

  await page.goto("/epics");
  const search = page.getByRole("combobox", { name: "기존 이슈를 하위로 넣기" });
  await search.fill("넣을 후보");
  await page
    .getByRole("listbox", { name: "기존 이슈를 하위로 넣기" })
    .getByRole("option", { name: new RegExp(task) })
    .click();

  // 선택만으로는 등록되지 않고, 취소하면 아무 관계도 남지 않습니다.
  await expect(page.getByRole("button", { name: "하위로 넣기" })).toBeVisible();
  await page.getByRole("button", { name: "선택 취소" }).click();
  await expect(search).toBeVisible();
  // bd는 상위가 없는 이슈의 parent 필드를 아예 생략합니다.
  expect((await workspace.showIssue(task)).parent).toBeUndefined();

  await search.fill("넣을 후보");
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
