import { expect, test } from "../support/bdWorkspace";

// CLI로 바꾼 내용은 새로고침 없이 화면에 오므로, 그 반영을 기다리는 시간을 넉넉히 잡습니다.
const NOTIFY_TIMEOUT = 10_000;

test("상세와 옆 패널이 열린 채로 CLI에서 상태를 바꾸면 새로고침하지 않아도 화면에 반영된다", async ({
  page,
  workspace,
}) => {
  const { main, dependency } = await workspace.createIssues(
    { main: { title: "주 이슈", type: "task" }, dependency: { title: "선행 이슈", type: "task" } },
    [["main", "dependency"]],
  );

  await page.goto(`/issues?issue=${main}&side=${dependency}`);
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  const side = page.getByRole("region", { name: `${dependency} 이슈 옆 패널` });
  await expect(dialog.getByLabel("상태", { exact: true })).toHaveValue("open");
  await expect(side.getByRole("heading", { name: "선행 이슈" })).toBeVisible();
  await expect(side.getByText("막힘", { exact: true })).toHaveCount(0);

  await workspace.bd("update", main, "--status", "in_progress");
  await workspace.bd("update", dependency, "--status", "blocked");

  await expect(dialog.getByLabel("상태", { exact: true })).toHaveValue("in_progress", {
    timeout: NOTIFY_TIMEOUT,
  });
  await expect(side.getByText("막힘", { exact: true })).toBeVisible({ timeout: NOTIFY_TIMEOUT });
});

test("페이지를 연 직후 CLI로 만든 이슈를 놓치지 않는다", async ({ page, workspace }) => {
  await workspace.createIssue("주 이슈");

  await page.goto("/issues");
  // 첫 조회가 기준값 알림을 기다리는 사이라도, 쓰기가 그 앞이나 뒤에 끼어들어도 화면에 반영되어야 합니다.
  await workspace.bd("create", "나중에 만든 이슈");

  await expect(page.getByRole("link", { name: "주 이슈" })).toBeVisible({
    timeout: NOTIFY_TIMEOUT,
  });
  await expect(page.getByRole("link", { name: "나중에 만든 이슈" })).toBeVisible({
    timeout: NOTIFY_TIMEOUT,
  });
});
