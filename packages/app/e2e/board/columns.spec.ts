import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("보드는 막힘, 바로 작업 가능, 진행 중, 닫힘 열만 보이고 보류 이슈는 보이지 않는다", async ({
  page,
  workspace,
}) => {
  await workspace.createIssues({
    ready: { title: "e2e 바로 할 작업" },
    deferred: { title: "e2e 미룬 작업", status: "deferred" },
  });

  await page.goto("/board");
  await expect(page.getByRole("link", { name: /e2e 바로 할 작업/ })).toBeVisible();

  await expect(page.getByRole("region")).toHaveText([
    /^막힘/,
    /^바로 작업 가능/,
    /^진행 중/,
    /^닫힘/,
  ]);
  await expect(page.getByRole("link", { name: /e2e 미룬 작업/ })).toHaveCount(0);
});

test("막힘 열에 카드를 놓아도 상태가 바뀌지 않는다", async ({ page, workspace }) => {
  const id = await workspace.createIssue("e2e 끌어 볼 작업");

  await page.goto("/board");
  const card = page.getByRole("link", { name: /e2e 끌어 볼 작업/ });
  await card.dragTo(page.getByRole("region", { name: "막힘" }));
  // 막힘 열에 놓은 것이 무시됐는지는, 이어서 진행 중으로 옮긴 뒤 bd의 변경 이력에 blocked가 없는지로 확인합니다.
  await card.dragTo(page.getByRole("region", { name: "진행 중" }));

  await expect
    .poll(async () => (await workspace.showIssue(id)).status, { timeout: SAVE_TIMEOUT })
    .toBe("in_progress");
  const history = JSON.parse(await workspace.bd("history", id, "--json")) as {
    Issue: { status: string };
  }[];
  expect(history.map(({ Issue }) => Issue.status)).not.toContain("blocked");
});
