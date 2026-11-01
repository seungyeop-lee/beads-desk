import { expect, test } from "../support/bdWorkspace";

test("판단할 일이 없으면 탭과 브라우저 탭 제목에 개수가 없고, bd CLI로 human 라벨을 붙이거나 닫으면 개수가 따라 바뀌며, 화면을 옮겨도 제목의 개수가 한 번만 붙는다", async ({
  page,
  workspace,
}) => {
  const plain = await workspace.createIssue("평범한 작업");
  const title = `${workspace.slug} · beads-desk`;

  await page.goto("issues");
  const screens = page.getByRole("navigation", { name: "화면" });
  await expect(page.getByRole("link", { name: "평범한 작업" })).toBeVisible();
  await expect(screens.getByRole("link", { name: "판단 기다림", exact: true })).toBeVisible();
  await expect(page).toHaveTitle(title);

  await workspace.bd("label", "add", plain, "human");
  await expect(screens.getByRole("link", { name: "판단 기다림 1개", exact: true })).toBeVisible();
  await expect(page).toHaveTitle(`(1) ${title}`);

  await screens.getByRole("link", { name: "판단 기다림 1개", exact: true }).click();
  await expect(page).toHaveURL(/\/human$/);
  await expect(page).toHaveTitle(`(1) ${title}`);
  await screens.getByRole("link", { name: "보드", exact: true }).click();
  await expect(page).toHaveURL(/\/board$/);
  await expect(page).toHaveTitle(`(1) ${title}`);

  await workspace.bd("close", plain);
  await expect(screens.getByRole("link", { name: "판단 기다림", exact: true })).toBeVisible();
  await expect(page).toHaveTitle(title);
});
