import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "../support/bdWorkspace";

test("판단할 일이 없으면 탭과 브라우저 탭 제목에 개수가 없고, bd CLI로 human 라벨을 붙이거나 닫으면 개수가 따라 바뀌며, 화면을 옮겨도 제목의 개수가 한 번만 붙고, diff·폴더 화면은 화면 탭 없이 파일·폴더 이름으로 시작하는 제목에 개수를 붙이지 않는다", async ({
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

  // 머리글에 보이는 항목은 ViewerHeader.browser.test.tsx가 확인하므로, 여기서는 viewer 머리글로 바뀌고 화면 탭이 없는 것만 확인합니다.
  const folder = join(workspace.path, "리뷰 산출물");
  const diff = join(folder, "리뷰 변경.diff");
  await mkdir(folder);
  await writeFile(diff, "@@ -1 +1 @@\n-이전 줄\n+바뀐 줄\n");
  await page.goto(`diff?${new URLSearchParams({ path: diff })}`);
  await expect(page.getByText("바뀐 줄", { exact: true })).toBeVisible();
  await expect(page.getByRole("banner")).toContainText("diff 뷰어");
  await expect(screens).toHaveCount(0);
  await expect(page).toHaveTitle(`리뷰 변경.diff · ${title}`);
  await page.goto(`files?${new URLSearchParams({ base: folder, path: folder })}`);
  await expect(page.getByRole("link", { name: "리뷰 변경.diff" })).toBeVisible();
  await expect(page.getByRole("banner")).toContainText("폴더 뷰어");
  await expect(screens).toHaveCount(0);
  await expect(page).toHaveTitle(`리뷰 산출물 · ${title}`);

  await page.goto("board");
  await workspace.bd("close", plain);
  await expect(screens.getByRole("link", { name: "판단 기다림", exact: true })).toBeVisible();
  await expect(page).toHaveTitle(title);
});
