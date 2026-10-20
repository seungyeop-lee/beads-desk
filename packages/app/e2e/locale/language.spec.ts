import { expect, test } from "../support/bdWorkspace";

test.use({ locale: "en-US" });

test("한국어가 아닌 브라우저에서는 영어로 열리고, 설정에서 고른 언어는 새로고침해도 유지된다", async ({
  page,
}) => {
  await page.goto("issues");

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1, name: "Issues" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Screens" }).getByRole("link", { name: "Board" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("combobox", { name: "Language" }).selectOption("ko");

  await expect(page.getByRole("heading", { level: 1, name: "이슈" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "이슈" })).toBeVisible();
  await page.getByRole("button", { name: "설정" }).click();
  await expect(page.getByRole("combobox", { name: "언어" })).toHaveValue("ko");
});
