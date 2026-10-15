import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("상세에서 가져가면 담당자가 정해지고 진행 중으로 바뀌며, 가져가기 버튼이 사라진다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("e2e 가져갈 작업", "--type", "task");

  await page.goto(`/issues?issue=${id}`);
  const detail = page.getByRole("dialog", { name: `${id} 이슈` });
  await detail.getByRole("button", { name: "가져가기" }).click();

  await expect
    .poll(async () => (await workspace.showIssue(id)).status, { timeout: SAVE_TIMEOUT })
    .toBe("in_progress");
  expect((await workspace.showIssue(id)).assignee).toBeTruthy();
  await expect(detail.getByLabel("상태", { exact: true })).toHaveValue("in_progress");
  await expect(detail.getByRole("button", { name: "가져가기" })).toHaveCount(0);
});

test("다른 담당자에게 지정된 이슈를 상세에서 가져가면 bd의 거부 사유가 보이고 이슈는 그대로다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue(
    "e2e 남의 작업",
    "--type",
    "task",
    "--assignee",
    "someone-else",
  );

  await page.goto(`/issues?issue=${id}`);
  const detail = page.getByRole("dialog", { name: `${id} 이슈` });
  await detail.getByRole("button", { name: "가져가기" }).click();

  await expect(detail.getByRole("alert")).toContainText('already assigned to "someone-else"');
  const issue = await workspace.showIssue(id);
  expect([issue.status, issue.assignee]).toEqual(["open", "someone-else"]);
});
