import { expect, test } from "../support/bdWorkspace";

// 서버는 SSE 연결이 있는 동안 DB를 2초마다 확인하므로, 알림을 받고 다시 조회할 시간까지 넉넉히 기다립니다.
const NOTIFY_TIMEOUT = 10_000;

test("다른 이슈에 막힌 열린 이슈를 목록, 에픽, 보드, 상세에서 막힘으로 보이고, 선행 이슈를 닫으면 표시가 사라진다", async ({
  page,
  workspace,
}) => {
  const epic = await workspace.createIssue("묶음 에픽", "--type", "epic");
  const blocker = await workspace.createIssue("선행 작업", "--type", "task", "--parent", epic);
  const waiting = await workspace.createIssue("기다리는 작업", "--type", "task", "--parent", epic);
  await workspace.bd("dep", "add", waiting, blocker);
  const waitingLine = (scope: ReturnType<typeof page.locator>) =>
    scope.getByRole("link", { name: `${blocker}을(를) 기다리는 중` });

  await page.goto("/issues");
  const waitingRow = page.getByRole("row").filter({ hasText: "기다리는 작업" });
  await expect(waitingLine(waitingRow)).toBeVisible();
  const blockerRow = page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: `${blocker} ID 복사` }) });
  await expect(blockerRow).toBeVisible();
  await expect(blockerRow.getByRole("link", { name: /기다리는 중$/ })).toHaveCount(0);

  await page.goto("/epics");
  await expect(
    waitingLine(page.getByRole("row").filter({ hasText: "기다리는 작업" })),
  ).toBeVisible();

  await page.goto("/board");
  await expect(
    page.getByRole("region", { name: "막힘" }).getByText(`${blocker}을(를) 기다리는 중`),
  ).toBeVisible();

  await page.goto(`/issues?issue=${waiting}`);
  const dialog = page.getByRole("dialog", { name: `${waiting} 이슈` });
  const banner = dialog.getByRole("region", { name: "먼저 끝나야 하는 이슈가 있습니다" });
  await expect(banner.getByRole("link", { name: `${blocker} 선행 작업` })).toBeVisible();

  await workspace.bd("close", blocker);

  await expect(banner).toHaveCount(0, { timeout: NOTIFY_TIMEOUT });
});
