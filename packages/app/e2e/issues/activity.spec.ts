import { expect, test } from "../support/bdWorkspace";

test("CLI로 상태를 바꾸고 관계를 더한 이슈의 활동 탭에 두 변경이 만든 기록 뒤에 시간순으로 보인다", async ({
  page,
  workspace,
}) => {
  const { target, blocker } = await workspace.createIssues({
    target: { title: "활동 대상 이슈" },
    blocker: { title: "먼저 할 이슈" },
  });
  await workspace.bd("update", target, "--status", "in_progress");
  // bd는 이벤트 시각을 초 단위로 남겨 같은 초의 이벤트는 순서가 정해지지 않으므로, 다음 변경을 다른 초에 남깁니다.
  await new Promise((resolve) => setTimeout(resolve, 1_100));
  await workspace.bd("dep", "add", target, blocker);

  await page.goto(`issues?issue=${target}`);
  const dialog = page.getByRole("dialog", { name: `${target} 이슈` });
  await dialog.getByRole("tab", { name: "활동" }).click();

  await expect(dialog.getByRole("tabpanel").locator("ul > li")).toHaveText([
    "이슈를 만들었습니다.",
    "상태: 열림 → 진행 중",
    `선행 관계로 ${blocker}을(를) 연결했습니다.`,
  ]);
  await expect(dialog.getByRole("tab", { name: "활동" })).toHaveAttribute("aria-selected", "true");
});
