import { expect, test } from "../support/bdWorkspace";

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
