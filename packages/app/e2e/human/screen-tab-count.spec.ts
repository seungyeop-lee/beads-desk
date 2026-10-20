import { expect, test } from "../support/bdWorkspace";

test("판단할 일이 없으면 탭에 개수가 없고, bd CLI로 human 라벨을 붙이거나 닫으면 탭의 개수가 따라 바뀐다", async ({
  page,
  workspace,
}) => {
  const plain = await workspace.createIssue("평범한 작업");

  await page.goto("issues");
  const screens = page.getByRole("navigation", { name: "화면" });
  await expect(page.getByRole("link", { name: "평범한 작업" })).toBeVisible();
  await expect(screens.getByRole("link", { name: "판단 기다림", exact: true })).toBeVisible();

  await workspace.bd("label", "add", plain, "human");
  await expect(screens.getByRole("link", { name: "판단 기다림 1개", exact: true })).toBeVisible();

  await workspace.bd("close", plain);
  await expect(screens.getByRole("link", { name: "판단 기다림", exact: true })).toBeVisible();
});
