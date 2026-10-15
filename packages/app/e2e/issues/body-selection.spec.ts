import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../support/bdWorkspace";

const BODY = "### 배경\n\n드래그해서 고를 문단입니다.";

/**
 * 문단의 앞부분을 드래그해 고르면서, 고르기 전과 고르는 동안의 제목 세로 위치를 돌려줍니다.
 * dialog가 열리는 애니메이션이 끝난 뒤에 재야 위치가 애니메이션 때문에 달라지지 않습니다. 커서 깜빡임처럼 끝없는 애니메이션은 기다리지 않습니다.
 */
async function headingTopsAroundDrag(
  page: Page,
  dialog: Locator,
  heading: Locator,
  paragraph: Locator,
) {
  await dialog.evaluate((element) =>
    Promise.all(
      element
        .getAnimations({ subtree: true })
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished),
    ),
  );
  const before = (await heading.boundingBox())?.y;
  const box = await paragraph.boundingBox();
  if (!box) throw new Error("문단이 보이지 않습니다");
  await page.mouse.move(box.x + 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + box.height / 2, { steps: 5 });
  expect(await page.evaluate(() => String(window.getSelection()))).not.toBe("");
  const during = (await heading.boundingBox())?.y;
  await page.mouse.up();
  return { before, during };
}

test("제목으로 시작하는 상세 본문은 읽을 때도 편집할 때도 드래그해 고르는 동안 움직이지 않는다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("드래그 이슈", "--description", BODY);

  await page.goto(`/issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  const heading = dialog.getByRole("heading", { name: "배경" });
  const paragraph = dialog.getByText("드래그해서 고를 문단입니다.");
  await expect(heading).toBeVisible();
  const reading = await headingTopsAroundDrag(page, dialog, heading, paragraph);
  expect(reading.during).toBe(reading.before);

  await dialog.getByRole("button", { name: "편집", exact: true }).click();
  const editor = dialog.getByRole("textbox", { name: "설명" });
  const editHeading = editor.getByRole("heading", { name: "배경" });
  await expect(editor).toBeFocused();
  const editing = await headingTopsAroundDrag(
    page,
    dialog,
    editHeading,
    editor.getByText("드래그해서 고를 문단입니다."),
  );
  expect(editing.during).toBe(editing.before);
});
