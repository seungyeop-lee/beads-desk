import { expect, test } from "../support/bdWorkspace";

test("CLI로 상태를 바꾸고 관계를 더한 이슈의 활동 탭에 bd history가 남긴 기록 세 건이 보인다", async ({
  page,
  workspace,
}) => {
  const { target, blocker } = await workspace.createIssues({
    target: { title: "활동 대상 이슈" },
    blocker: { title: "먼저 할 이슈" },
  });
  await workspace.bd("update", target, "--status", "in_progress");
  await workspace.bd("dep", "add", target, blocker);

  await page.goto(`issues?issue=${target}`);
  const dialog = page.getByRole("dialog", { name: `${target} 이슈` });
  await dialog.getByRole("tab", { name: "활동" }).click();

  // bd는 이벤트 시각을 초 단위로 남겨 같은 초의 두 변경은 순서가 정해지지 않으므로, 순서는 보지 않고 기록마다 하나씩 있는지만 확인합니다.
  const records = dialog.getByRole("tabpanel").locator("ul > li");
  await expect(records).toHaveCount(3);
  await expect(records.filter({ hasText: "진행 중" })).toHaveCount(1);
  await expect(records.filter({ hasText: blocker })).toHaveCount(1);
});
