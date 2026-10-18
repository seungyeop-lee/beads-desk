import type { Page } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

test("새 이슈 대화상자에서 상위 이슈를 찾아 고르고 지운 뒤 다시 고르면 그 이슈의 하위로 만들어진다", async ({
  page,
  workspace,
}) => {
  const epic = await workspace.createIssue("상위로 고를 에픽", "--type", "epic");

  await page.goto("/issues");
  await page.getByRole("button", { name: "새 이슈" }).click();
  const dialog = page.getByRole("dialog", { name: "새 이슈" });
  await expect(dialog.getByRole("textbox", { name: "제목" })).toBeFocused();
  await dialog.getByRole("textbox", { name: "제목" }).fill("상위가 있는 새 이슈");

  const search = dialog.getByRole("combobox", { name: "상위 이슈 찾기" });
  await search.fill("상위로");
  const candidates = dialog.getByRole("listbox", { name: "상위 이슈 찾기" });
  await expect(candidates.getByRole("option", { name: new RegExp(epic) })).toBeVisible();
  await search.press("Escape");
  await expect(candidates).toBeHidden();
  await expect(dialog).toBeVisible();

  await search.press("ArrowDown");
  await candidates.getByRole("option", { name: new RegExp(epic) }).click();
  const clear = dialog.getByRole("button", { name: "상위 이슈 지우기" });
  await clear.click();
  await expect(clear).toBeHidden();
  await expect(search).toHaveValue("");

  await search.fill("상위로");
  await candidates.getByRole("option", { name: new RegExp(epic) }).click();
  await expect(clear).toBeVisible();
  await dialog.getByRole("button", { name: "만들기" }).click();

  const created = await createdIssueId(page);
  await expect(page.getByRole("dialog", { name: `${created} 이슈` })).toBeVisible();
  await expect
    .poll(async () => (await workspace.showIssue(created)).parent, { timeout: SAVE_TIMEOUT })
    .toBe(epic);
});

async function createdIssueId(page: Page) {
  await expect(page).toHaveURL(/[?&]issue=/);
  const id = new URL(page.url()).searchParams.get("issue");
  if (!id) throw new Error("만든 이슈의 id를 주소에서 읽지 못했습니다.");
  return id;
}
