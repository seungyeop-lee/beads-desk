import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("상세에서 가져가면 bd에 담당자와 진행 중 상태가 저장되고, 상세의 상태 칸이 진행 중으로 바뀐다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("e2e 가져갈 작업", "--type", "task");

  await page.goto(`issues?issue=${id}`);
  const detail = page.getByRole("dialog", { name: `${id} 이슈` });
  await detail.getByRole("button", { name: "가져가기" }).click();

  await expect
    .poll(async () => (await workspace.showIssue(id)).status, { timeout: SAVE_TIMEOUT })
    .toBe("in_progress");
  expect((await workspace.showIssue(id)).assignee).toBeTruthy();
  await expect(detail.getByLabel("상태", { exact: true })).toHaveValue("in_progress");
});
