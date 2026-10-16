import { expect, test } from "../support/bdWorkspace";

test("닫힌 에픽만 있으면 처음 열 때 하위 이슈 목록이 접혀 있고, 펼치기 단추로 펼칠 수 있다", async ({
  page,
  workspace,
}) => {
  const { epic } = await workspace.createIssues({
    epic: { title: "끝난 에픽", type: "epic", status: "closed" },
    task: { title: "끝난 에픽의 작업", type: "task", status: "closed", parent: "epic" },
  });

  await page.goto("/epics");
  await expect(page.getByText("끝난 에픽", { exact: true })).toBeVisible();
  const toggle = page.getByRole("button", { name: `${epic} 하위 이슈 펼치기` });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("link", { name: "끝난 에픽의 작업" })).toHaveCount(0);

  await toggle.click();
  await expect(page.getByRole("button", { name: `${epic} 하위 이슈 접기` })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.getByRole("link", { name: "끝난 에픽의 작업" })).toBeVisible();
});
