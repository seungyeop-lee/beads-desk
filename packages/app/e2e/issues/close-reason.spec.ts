import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("표에서 바꾼 상태와 우선순위는 바로 bd에 저장되고, 제목으로 연 상세에서 사유를 적어 닫으면 그 사유가 저장되어 보이며 바로 작업 가능해진 이슈를 알린다", async ({
  page,
  workspace,
}) => {
  const { blocker, waiting } = await workspace.createIssues(
    {
      blocker: { title: "e2e 선행 작업", type: "task" },
      waiting: { title: "e2e 기다리던 작업", type: "task", priority: 2 },
    },
    [["waiting", "blocker"]],
  );

  await page.goto("issues");
  await page
    .getByRole("combobox", { name: `${blocker} 상태`, exact: true })
    .selectOption("in_progress");
  await expect
    .poll(async () => (await workspace.showIssue(blocker)).status, { timeout: SAVE_TIMEOUT })
    .toBe("in_progress");

  await page.getByRole("combobox", { name: `${waiting} 우선순위`, exact: true }).selectOption("0");
  await expect
    .poll(async () => (await workspace.showIssue(waiting)).priority, { timeout: SAVE_TIMEOUT })
    .toBe(0);

  await page.getByRole("link", { name: "e2e 선행 작업", exact: true }).click();
  const detail = page.getByRole("dialog", { name: `${blocker} 이슈`, exact: true });
  await detail.getByLabel("상태", { exact: true }).selectOption("closed");
  const closing = page.getByRole("dialog", { name: "이슈 닫기" });
  await closing.getByRole("textbox", { name: "닫는 사유" }).fill("e2e로 확인함");
  await closing.getByRole("button", { name: "이슈 닫기" }).click();

  await expect(page.getByRole("status")).toContainText(`${waiting} e2e 기다리던 작업`);
  await expect
    .poll(async () => (await workspace.showIssue(blocker)).close_reason, {
      timeout: SAVE_TIMEOUT,
    })
    .toBe("e2e로 확인함");
  await expect(detail.getByText("e2e로 확인함")).toBeVisible();
});
