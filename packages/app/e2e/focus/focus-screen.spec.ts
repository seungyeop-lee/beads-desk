import { expect, test } from "../support/bdWorkspace";

test("첫 화면은 지금 화면이고, 개수 카드와 모두 보기는 이슈 목록의 같은 보기 탭을 연다", async ({
  page,
  workspace,
}) => {
  const epic = await workspace.createIssue("묶음 에픽", "--type", "epic");
  const doing = await workspace.createIssue("진행하는 작업", "--type", "task", "--parent", epic);
  await workspace.bd("update", doing, "--status", "in_progress", "--assignee", "minji");
  await workspace.createIssue("급한 작업", "--type", "task", "--priority", "0");
  const blocker = await workspace.createIssue("선행 작업", "--type", "task");
  for (const title of ["작업 셋", "작업 넷", "작업 다섯", "작업 여섯"]) {
    await workspace.createIssue(title, "--type", "task", "--priority", "3");
  }
  const waiting = await workspace.createIssue("기다리는 작업", "--type", "task");
  await workspace.bd("dep", "add", waiting, blocker);

  await page.goto("/");
  await expect(page).toHaveURL(/\/focus$/);
  await expect(page.getByRole("link", { name: "지금" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "진행 중 1", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "바로 작업 가능 6", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "막힘 1", exact: true })).toBeVisible();

  const nextUp = page.getByRole("region", { name: "다음에 할 일" });
  await expect(nextUp.getByRole("listitem")).toHaveCount(5);
  await expect(nextUp.getByRole("listitem").first()).toContainText("급한 작업");
  await expect(page.getByRole("region", { name: "막힘" })).toContainText(`← ${blocker} 선행 작업`);
  await expect(page.getByRole("region", { name: "진행 중", exact: true })).toContainText("minji");
  await expect(page.getByRole("region", { name: "에픽 진행률" })).toContainText("묶음 에픽");

  const tabs = page.getByRole("navigation", { name: "보기" });
  await nextUp.getByRole("link", { name: /모두 보기/ }).click();
  await expect(page).toHaveURL(/\/issues\?view=ready$/);
  await expect(tabs.getByRole("link", { name: "바로 작업 가능 6" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.goBack();
  await expect(page).toHaveURL(/\/focus$/);
  await page.getByRole("link", { name: "막힘 1", exact: true }).click();
  await expect(page).toHaveURL(/\/issues\?view=blocked$/);
  await expect(tabs.getByRole("link", { name: "막힘 1" })).toHaveAttribute("aria-current", "page");
});

test("지금 화면의 줄을 누르면 그 위에 상세가 열리고, 닫으면 지금 화면으로 돌아온다", async ({
  page,
  workspace,
}) => {
  const doing = await workspace.createIssue("진행하는 작업", "--type", "task");
  await workspace.bd("update", doing, "--status", "in_progress");
  await workspace.createIssue("다음 작업", "--type", "task");

  await page.goto("/focus");
  const nextUp = page.getByRole("region", { name: "다음에 할 일" });
  await expect(nextUp.getByRole("listitem")).toHaveCount(1);
  await expect(nextUp.getByRole("link", { name: /모두 보기/ })).toHaveCount(0);

  await page.getByRole("region", { name: "진행 중", exact: true }).getByRole("link").click();
  await expect(page.getByRole("dialog", { name: `${doing} 이슈` })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/focus\\?issue=${doing}$`));
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/focus$/);
});
