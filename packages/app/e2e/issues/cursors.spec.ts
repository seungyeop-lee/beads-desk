import { expect, test } from "../support/bdWorkspace";

test("상세를 불러오는 동안 링크와 단추 위에서도 progress 커서를 보이고, 열린 상세의 제목은 text 커서를 보인다", async ({
  page,
  workspace,
}) => {
  const ready = await workspace.createIssue("시작할 작업");
  await page.goto("issues");

  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/issues/${ready}?*`, async (route) => {
    await held;
    await route.continue();
  });
  try {
    await page.getByRole("link", { name: "시작할 작업", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-busy", "");
    await expect(page.getByRole("button", { name: /바로 작업 가능 묶음/ })).toHaveCSS(
      "cursor",
      "progress",
    );
    await expect(page.getByRole("link", { name: "시작할 작업", exact: true })).toHaveCSS(
      "cursor",
      "progress",
    );
  } finally {
    release();
  }
  const dialog = page.getByRole("dialog", { name: `${ready} 이슈` });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "시작할 작업", exact: true })).toHaveCSS(
    "cursor",
    "text",
  );
});
