import type { Page } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";

/** 지금 화면에 적용된 테마가 밝은지 어두운지입니다. daisyUI 테마마다 `color-scheme`이 정해져 있습니다. */
function appliedScheme(page: Page) {
  return page.locator("html").evaluate((html) => getComputedStyle(html).colorScheme);
}

test("테마를 고르지 않으면 운영체제 설정을 따른다", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/issues");
  await expect.poll(() => appliedScheme(page)).toBe("dark");

  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => appliedScheme(page)).toBe("light");
});

test("설정에서 고른 테마는 운영체제 설정과 관계없이 적용되고, 새로고침해도 유지된다", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/issues");

  await page.getByRole("button", { name: "설정" }).click();
  const settings = page.getByRole("dialog", { name: "설정" });
  await settings.getByRole("combobox", { name: "테마" }).selectOption("dark");
  await expect.poll(() => appliedScheme(page)).toBe("dark");

  await page.reload();
  await expect.poll(() => appliedScheme(page)).toBe("dark");
  // 서버가 처음 보내는 HTML에 이미 테마가 들어 있어야, 다른 테마가 잠깐 보였다가 바뀌지 않습니다.
  const html = await (await page.request.get("/issues")).text();
  expect(html).toContain('data-theme="desk-dark"');

  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("button", { name: "설정" }).click();
  await settings.getByRole("combobox", { name: "테마" }).selectOption("light");
  await expect.poll(() => appliedScheme(page)).toBe("light");

  await settings.getByRole("combobox", { name: "테마" }).selectOption("system");
  await expect.poll(() => appliedScheme(page)).toBe("dark");
  await page.reload();
  await expect.poll(() => appliedScheme(page)).toBe("dark");
  await page.getByRole("button", { name: "설정" }).click();
  await expect(settings.getByRole("combobox", { name: "테마" })).toHaveValue("system");
});
