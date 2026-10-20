import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test("지금 화면 행, 보드 카드, 상세 머리글의 ID를 누르면 전체 ID를 복사하고, 행과 카드는 상세를 열거나 끌리지 않으며, 보드 카드는 누르는 동안 grabbing 커서를 보인다", async ({
  page,
  workspace,
}) => {
  const work = await workspace.createIssue("e2e 복사할 작업");
  const copyButton = page.getByRole("button", { name: `${work} ID 복사` });
  const dialog = page.getByRole("dialog", { name: `${work} 이슈` });
  // 행과 카드의 링크는 ID 밖 전체를 덮습니다.
  const row = page.getByRole("link", { name: `${work} e2e 복사할 작업` });

  await page.goto("focus");
  // 시나리오 workspace의 prefix는 `e2e`이므로 행에는 `e2e-` 뒤만 보입니다.
  await expect(copyButton).toHaveText(work.replace(/^e2e-/, ""));
  await expectCopies(page, copyButton, work);
  await expect(page).not.toHaveURL(/issue=/);
  await row.click();
  await expect(dialog).toBeVisible();
  await expectCopies(page, dialog.getByRole("button", { name: `${work} ID 복사` }), work);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.goto("board");
  await expectCopies(page, copyButton, work);
  await expect(page).not.toHaveURL(/issue=/);

  // 끌기가 시작됐는지는 dragstart로 확인합니다. 같은 열 안에서 놓으면 상태를 바꾸지 않습니다.
  await page.evaluate(() => {
    document.documentElement.dataset.dragged = "false";
    document.addEventListener("dragstart", () => {
      document.documentElement.dataset.dragged = "true";
    });
  });
  await pressAndMove(copyButton, row);
  await expect(page.locator("html")).toHaveAttribute("data-dragged", "false");
  // 누르는 동안의 grabbing 커서는 컴포넌트 테스트에서 마우스를 누를 수 없어 여기서 확인합니다.
  await pressAndMove(row, copyButton, () => expect(row).toHaveCSS("cursor", "grabbing"));
  await expect(page.locator("html")).toHaveAttribute("data-dragged", "true");

  await row.click();
  await expect(dialog).toBeVisible();
});

test("상세 dialog를 열면 머리글의 ID 복사 단추가 아니라 닫기 단추에 focus가 있어 Enter로 닫히고, ID 복사 단추에는 Shift+Tab으로 간다", async ({
  page,
  workspace,
}) => {
  const work = await workspace.createIssue("e2e 상세를 열 작업");
  const dialog = page.getByRole("dialog", { name: `${work} 이슈` });

  await page.goto("issues");
  await page.getByRole("link", { name: "e2e 상세를 열 작업", exact: true }).click();
  await expect(dialog).toBeVisible();
  // dialog 밖을 눌러 닫는 영역도 이름이 "닫기"인 단추라, 머리글의 닫기 단추는 앞의 것입니다.
  await expect(dialog.getByRole("button", { name: "닫기", exact: true }).first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: `${work} ID 복사` })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
});

/** 단추를 누르면 클립보드에 id가 들어가고 복사 Toast가 하나 더 뜨는지 확인합니다. 같은 id를 연달아 복사해도 Toast 수로 구분합니다. */
async function expectCopies(page: Page, button: Locator, id: string) {
  await page.evaluate(() => navigator.clipboard.writeText(""));
  const toasts = page.getByText(`ID를 복사했습니다: ${id}`, { exact: true });
  const before = await toasts.count();
  await expect(button).toHaveCSS("cursor", "copy");
  await button.click();
  await expect(toasts).toHaveCount(before + 1);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(id);
}

/** whilePressed는 마우스를 누른 뒤 움직이기 전에 실행합니다. */
async function pressAndMove(from: Locator, to: Locator, whilePressed?: () => Promise<void>) {
  const page = from.page();
  await from.hover();
  await page.mouse.down();
  await whilePressed?.();
  const box = (await from.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 10);
  await to.hover();
  await page.mouse.up();
}
