import { expect, test } from "../support/bdWorkspace";

/** 시나리오 workspace의 prefix는 `e2e`이므로 표에는 `e2e-` 뒤만 보입니다. */
function shortId(id: string) {
  return id.replace(/^e2e-/, "");
}

test("이슈 표는 ID를 prefix 없이 보이되 전체 ID를 복사하고, 담당자는 고칠 수 없는 글자로 보인다", async ({
  page,
  workspace,
}) => {
  const task = await workspace.createIssue("담당자 있는 작업", "--assignee", "minji");

  await page.goto("/issues");
  const row = page.getByRole("row").filter({ hasText: "담당자 있는 작업" });
  const copyId = row.getByRole("button", { name: `${task} ID 복사` });
  await expect(copyId).toHaveText(shortId(task));

  const assignee = row.getByRole("cell", { name: "minji", exact: true });
  await expect(assignee).toBeVisible();
  await expect(assignee.getByRole("button")).toHaveCount(0);
  await expect(row.getByRole("textbox")).toHaveCount(0);
  await expect(row.getByRole("combobox", { name: `${task} 상태` })).toBeEnabled();
  await expect(row.getByRole("combobox", { name: `${task} 우선순위` })).toBeEnabled();
});

test("에픽 화면은 에픽 요약 줄과 하위 표에서 ID를 prefix 없이 보이고, 요약 줄은 전체 ID를 title로 보인다", async ({
  page,
  workspace,
}) => {
  const { epic, child } = await workspace.createIssues({
    epic: { title: "묶음 에픽", type: "epic" },
    child: { title: "에픽 아래 작업", type: "task", parent: "epic" },
  });

  await page.goto("/epics");
  await expect(page.getByText(shortId(epic), { exact: true })).toHaveAttribute("title", epic);
  await expect(page.getByRole("button", { name: `${child} ID 복사` })).toHaveText(shortId(child));
});

test("결정 표는 ID를 prefix 없이 보이고 전체 ID를 title로 보인다", async ({ page, workspace }) => {
  const decision = await workspace.createIssue("e2e 결정", "--type", "decision");

  await page.goto("/decisions");
  const row = page.getByRole("row").filter({ hasText: "e2e 결정" });
  await expect(row.getByRole("cell", { name: shortId(decision), exact: true })).toHaveAttribute(
    "title",
    decision,
  );
});
