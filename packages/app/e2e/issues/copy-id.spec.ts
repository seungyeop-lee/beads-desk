import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";
import { createHumanGate } from "../support/humanGates";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test("판단 기다림 화면에서 Blocks 행과 왼쪽 카드의 ID를 누르면 전체 ID를 복사하고, 카드의 ID를 눌러도 그 카드를 고르지 않는다", async ({
  page,
  workspace,
}) => {
  const { work, question } = await workspace.createIssues({
    work: { title: "e2e 검토받을 작업", type: "task" },
    question: { title: "e2e 정해야 할 질문", type: "task", labels: ["human"] },
  });
  const gate = await createHumanGate(workspace, work, "결과 확인");

  await page.goto("/human");
  const decision = page.getByRole("region", { name: `Review: ${work}` });
  await expectCopies(
    page,
    decision.getByRole("region", { name: "막고 있는 작업" }).getByRole("button", {
      name: `${work} ID 복사`,
    }),
    work,
  );

  const questionCard = page.getByRole("button", { name: `${question} e2e 정해야 할 질문` });
  await expect(page.getByRole("button", { name: `${gate} Review: ${work}` })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expectCopies(
    page,
    page
      .getByRole("region", { name: "질문", exact: true })
      .getByRole("button", { name: `${question} ID 복사` }),
    question,
  );
  await expect(questionCard).not.toHaveAttribute("aria-current", "true");
  await expect(decision).toBeVisible();

  await questionCard.click();
  await expect(questionCard).toHaveAttribute("aria-current", "true");
});

test("지금 화면 행, 보드 카드, 상세 머리글의 ID를 누르면 전체 ID를 복사하고, 행과 카드는 상세를 열거나 끌리지 않는다", async ({
  page,
  workspace,
}) => {
  const work = await workspace.createIssue("e2e 복사할 작업");
  const copyButton = page.getByRole("button", { name: `${work} ID 복사` });
  const dialog = page.getByRole("dialog", { name: `${work} 이슈` });
  // 행과 카드의 링크는 ID 밖 전체를 덮습니다.
  const row = page.getByRole("link", { name: `${work} e2e 복사할 작업` });

  await page.goto("/focus");
  await expectCopies(page, copyButton, work);
  await expect(page).not.toHaveURL(/issue=/);
  await row.click();
  await expect(dialog).toBeVisible();
  await expectCopies(page, dialog.getByRole("button", { name: `${work} ID 복사` }), work);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.goto("/board");
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
  await pressAndMove(row, copyButton);
  await expect(page.locator("html")).toHaveAttribute("data-dragged", "true");

  await row.click();
  await expect(dialog).toBeVisible();
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

async function pressAndMove(from: Locator, to: Locator) {
  const page = from.page();
  await from.hover();
  await page.mouse.down();
  const box = (await from.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 10);
  await to.hover();
  await page.mouse.up();
}
