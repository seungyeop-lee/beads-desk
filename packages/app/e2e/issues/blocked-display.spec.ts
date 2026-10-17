import { expect, test } from "../support/bdWorkspace";

// 선행 이슈를 CLI로 닫으면 막힘 표시는 새로고침 없이 사라지므로, 그 반영을 기다리는 시간을 넉넉히 잡습니다.
const NOTIFY_TIMEOUT = 10_000;

test("다른 이슈에 막힌 열린 이슈를 목록, 에픽, 보드, 상세에서 막힘으로 보이고, 선행 이슈를 닫으면 표시가 사라진다", async ({
  page,
  workspace,
}) => {
  const { blocker, waiting } = await workspace.createIssues(
    {
      epic: { title: "묶음 에픽", type: "epic" },
      blocker: { title: "선행 작업", type: "task", parent: "epic" },
      waiting: { title: "기다리는 작업", type: "task", parent: "epic" },
    },
    [["waiting", "blocker"]],
  );
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
