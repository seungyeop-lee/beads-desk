import { expect, test } from "../support/bdWorkspace";

// 서버는 SSE 연결이 있는 동안 DB를 2초마다 확인하므로, 알림을 받고 다시 조회할 시간까지 넉넉히 기다립니다.
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
