import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("표에서 상태를 바꾸면 바로 저장하고, 닫힘은 사유를 물어 취소하면 그대로 두며, 상세에서 입력한 사유로 닫으면 그 사유와 바로 작업 가능해진 이슈를 알린다", async ({
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
  const status = page.getByRole("combobox", { name: `${blocker} 상태`, exact: true });
  await status.selectOption("in_progress");
  await expect
    .poll(async () => (await workspace.showIssue(blocker)).status, { timeout: SAVE_TIMEOUT })
    .toBe("in_progress");

  await status.selectOption("closed");
  const closing = page.getByRole("dialog", { name: "이슈 닫기" });
  await closing.getByRole("button", { name: "취소" }).click();
  await expect(status).toHaveValue("in_progress");
  expect((await workspace.showIssue(blocker)).status).toBe("in_progress");

  await page.getByRole("link", { name: "e2e 선행 작업", exact: true }).click();
  const detail = page.getByRole("dialog", { name: `${blocker} 이슈`, exact: true });
  await detail.getByLabel("상태", { exact: true }).selectOption("closed");
  await expect(closing.getByRole("textbox", { name: "닫는 사유" })).toBeFocused();
  await closing.getByRole("textbox", { name: "닫는 사유" }).fill("e2e로 확인함");
  await closing.getByRole("button", { name: "이슈 닫기" }).click();

  await expect(page.getByRole("status")).toContainText(`${waiting} e2e 기다리던 작업`);
  await expect
    .poll(async () => (await workspace.showIssue(blocker)).close_reason, {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("e2e로 확인함");
  await expect(closing).toBeHidden();
  await expect(detail.getByText("e2e로 확인함")).toBeVisible();
});
