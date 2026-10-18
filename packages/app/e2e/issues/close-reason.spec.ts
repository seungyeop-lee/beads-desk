import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("상세에서 닫힘을 고르면 사유를 묻고, 입력한 사유로 닫아 상세에 그 사유를 보인다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("e2e 작업", "--type", "task");

  await page.goto(`/issues?issue=${id}`);
  const detail = page.getByRole("dialog", { name: `${id} 이슈`, exact: true });
  await detail.getByLabel("상태", { exact: true }).selectOption("closed");
  const closing = page.getByRole("dialog", { name: "이슈 닫기" });
  await expect(closing.getByRole("textbox", { name: "닫는 사유" })).toBeFocused();
  await closing.getByRole("textbox", { name: "닫는 사유" }).fill("e2e로 확인함");
  await closing.getByRole("button", { name: "이슈 닫기" }).click();

  await expect
    .poll(async () => (await workspace.showIssue(id)).close_reason, { timeout: SAVE_TIMEOUT })
    .toBe("e2e로 확인함");
  await expect(closing).toBeHidden();
  await expect(detail.getByText("e2e로 확인함")).toBeVisible();
});

test("사유 입력을 취소하면 닫지 않고 상태를 그대로 둔다", async ({ page, workspace }) => {
  const id = await workspace.createIssue("e2e 작업", "--type", "task");

  await page.goto("/issues");
  const status = page.getByRole("combobox", { name: `${id} 상태`, exact: true });
  await status.selectOption("closed");
  await page
    .getByRole("dialog", { name: "이슈 닫기" })
    .getByRole("button", { name: "취소" })
    .click();

  await expect(status).toHaveValue("open");
  expect((await workspace.showIssue(id)).status).toBe("open");
});

test("선행 이슈를 닫으면 그 때문에 막혀 있던 이슈가 바로 작업 가능해졌다고 Toast로 알린다", async ({
  page,
  workspace,
}) => {
  const { blocker, waiting } = await workspace.createIssues(
    {
      blocker: { title: "e2e 선행 작업", type: "task" },
      waiting: { title: "e2e 기다리던 작업", type: "task" },
    },
    [["waiting", "blocker"]],
  );

  await page.goto("/issues");
  await page.getByRole("combobox", { name: `${blocker} 상태`, exact: true }).selectOption("closed");
  await page
    .getByRole("dialog", { name: "이슈 닫기" })
    .getByRole("button", { name: "이슈 닫기" })
    .click();

  await expect(page.getByRole("status")).toContainText(`${waiting} e2e 기다리던 작업`);
  expect((await workspace.showIssue(blocker)).close_reason).toBe("Closed");
});
