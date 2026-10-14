import type { Page } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

const ORIGINAL = [
  "## 배경",
  "",
  "`bd-desk-2lj.1.1`~`.1.4`와 [third, second] 같은 글자가 있는 문단입니다.",
  "",
  "* 별표 목록",
  "    - 네 칸 들여 쓴 하위 목록",
  "",
  "| 위치 | 이름 |",
  "| --- | --- |",
  "| `a.ts` | `b` |",
  "",
  "참고: https://github.com/Milkdown/milkdown",
  "",
  "[관련 문서][1]를 봅니다.",
  "",
  "[메모]: https://example.com/memo",
  "",
  "<br>",
  "",
  "고칠 문단",
  "",
  "[1]: https://example.com/doc",
].join("\n");

test("상세 본문은 편집하는 동안에도 서식대로 보이고, 고친 문단 말고는 원문 글자 그대로 bd에 저장된다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("본문 편집 이슈", "--description", ORIGINAL);

  await page.goto(`/issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  await expect(dialog.getByRole("heading", { name: "배경" })).toBeVisible();
  await dialog.getByRole("button", { name: "편집", exact: true }).click();

  const editor = dialog.getByRole("textbox", { name: "설명" });
  await expect(editor.getByRole("heading", { name: "배경" })).toBeVisible();
  await editor.getByText("고칠 문단").click();
  await page.keyboard.press("End");
  await page.keyboard.type(" 고침");
  await page.keyboard.press("ControlOrMeta+Enter");

  await expect
    .poll(async () => (await workspace.showIssue(id)).description, { timeout: SAVE_TIMEOUT })
    .toBe(ORIGINAL.replace("고칠 문단", "고칠 문단 고침"));
});

test("읽기 모드 본문의 링크를 누르면 그 주소로 이동한다", async ({ page, workspace }) => {
  const id = await workspace.createIssue(
    "링크 이슈",
    "--description",
    "[에픽 화면](/epics)으로 갑니다.",
  );

  await page.goto(`/issues?issue=${id}`);
  await page
    .getByRole("dialog", { name: `${id} 이슈` })
    .getByRole("link", { name: "에픽 화면" })
    .click();

  await expect(page).toHaveURL(/\/epics$/);
});

test("새 이슈 창의 설명은 편집기로 입력하고 Ctrl/Cmd+Enter로 만들면 bd 설명에 저장된다", async ({
  page,
  workspace,
}) => {
  await page.goto("/issues");
  await page.getByRole("button", { name: "새 이슈" }).click();
  const dialog = page.getByRole("dialog", { name: "새 이슈" });
  await dialog.getByRole("textbox", { name: "제목" }).fill("설명 있는 새 이슈");
  await dialog.getByRole("textbox", { name: "설명" }).click();
  await page.keyboard.type("새 이슈 설명");
  await page.keyboard.press("ControlOrMeta+Enter");

  await expect(page).toHaveURL(/[?&]issue=/);
  const created = new URL(page.url()).searchParams.get("issue") ?? "";
  await expect
    .poll(async () => (await workspace.showIssue(created)).description, { timeout: SAVE_TIMEOUT })
    .toBe("새 이슈 설명");
});

test("편집 도구 줄의 표 넣기 단추로 넣은 표는 bd에 markdown 표로 저장된다", async ({
  page,
  workspace,
}) => {
  await page.goto("/issues");
  await page.getByRole("button", { name: "새 이슈" }).click();
  const dialog = page.getByRole("dialog", { name: "새 이슈" });
  await dialog.getByRole("textbox", { name: "제목" }).fill("표 있는 새 이슈");
  await dialog.getByRole("textbox", { name: "설명" }).click();
  await dialog
    .getByRole("toolbar", { name: "설명 서식 도구" })
    .getByRole("button", { name: "표 넣기" })
    .click();
  await page.keyboard.type("첫 칸");
  await page.keyboard.press("ControlOrMeta+Enter");

  await expect(page).toHaveURL(/[?&]issue=/);
  const created = new URL(page.url()).searchParams.get("issue") ?? "";
  await expect
    .poll(async () => (await workspace.showIssue(created)).description, { timeout: SAVE_TIMEOUT })
    .toMatch(/^\| 첫 칸 +\|.*\|\n\| [-:]+ +\|/);
});

test("편집 도구 줄에서 문단 형식을 제목 2로 바꾸면 bd에 ## 제목으로 저장된다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("제목 바꾸기 이슈", "--description", "제목이 될 문단");

  await page.goto(`/issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  await dialog.getByRole("button", { name: "편집", exact: true }).click();
  await dialog.getByRole("textbox", { name: "설명" }).getByText("제목이 될 문단").click();
  await dialog
    .getByRole("toolbar", { name: "설명 서식 도구" })
    .getByRole("combobox", { name: "문단 형식" })
    .selectOption({ label: "제목 2" });
  await page.keyboard.press("ControlOrMeta+Enter");

  await expect
    .poll(async () => (await workspace.showIssue(id)).description, { timeout: SAVE_TIMEOUT })
    .toBe("## 제목이 될 문단");
});

test("상세 본문을 편집하는 중에 Escape를 눌러도 편집이 취소되거나 상세가 닫히지 않는다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("Escape 이슈", "--description", "편집 중인 문단");

  await page.goto(`/issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  await dialog.getByRole("button", { name: "편집", exact: true }).click();
  const editor = dialog.getByRole("textbox", { name: "설명" });
  await editor.getByText("편집 중인 문단").click();
  await page.keyboard.press("Escape");

  await expect(editor).toBeFocused();
  await expect(dialog).toBeVisible();
});

test("새 이슈 창의 설명 편집기에서 Escape를 눌러도 창이 닫히지 않는다", async ({ page }) => {
  await page.goto("/issues");
  await page.getByRole("button", { name: "새 이슈" }).click();
  const dialog = page.getByRole("dialog", { name: "새 이슈" });
  const editor = dialog.getByRole("textbox", { name: "설명" });
  await editor.click();
  await page.keyboard.press("Escape");

  await expect(editor).toBeFocused();
  await expect(dialog).toBeVisible();
});

test("상세 본문의 저장 단추를 누르면 고친 본문이 bd에 저장된다", async ({ page, workspace }) => {
  const id = await workspace.createIssue("저장 단추 이슈", "--description", "저장할 문단");

  await page.goto(`/issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  await dialog.getByRole("button", { name: "편집", exact: true }).click();
  await dialog.getByRole("textbox", { name: "설명" }).getByText("저장할 문단").click();
  await page.keyboard.press("End");
  await page.keyboard.type(" 고침");
  await dialog.getByRole("button", { name: "저장", exact: true }).click();

  await expect
    .poll(async () => (await workspace.showIssue(id)).description, { timeout: SAVE_TIMEOUT })
    .toBe("저장할 문단 고침");
});

test("상세 본문의 취소 단추를 누르면 고친 내용을 버리고 원래 본문을 보여 준다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("취소 단추 이슈", "--description", "그대로 둘 문단");

  await page.goto(`/issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  await dialog.getByRole("button", { name: "편집", exact: true }).click();
  await dialog.getByRole("textbox", { name: "설명" }).getByText("그대로 둘 문단").click();
  await page.keyboard.press("End");
  await page.keyboard.type(" 버릴 글자");
  await dialog.getByRole("button", { name: "취소", exact: true }).click();

  await expect(dialog.getByRole("textbox", { name: "설명" })).toBeHidden();
  await expect(dialog.getByText("그대로 둘 문단", { exact: true })).toBeVisible();
  expect((await workspace.showIssue(id)).description).toBe("그대로 둘 문단");
});

test("상세 본문의 코드 블록 안에서도 Ctrl/Cmd+Enter로 저장한다", async ({ page, workspace }) => {
  const id = await workspace.createIssue(
    "코드 블록 이슈",
    "--description",
    "```ts\nconst a = 1;\n```",
  );

  await page.goto(`/issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  await dialog.getByRole("button", { name: "편집", exact: true }).click();
  await dialog.getByRole("textbox", { name: "설명" }).getByText("const a = 1;").click();
  await page.keyboard.press("End");
  await page.keyboard.type(" // 고침");
  await page.keyboard.press("ControlOrMeta+Enter");

  await expect
    .poll(async () => (await workspace.showIssue(id)).description, { timeout: SAVE_TIMEOUT })
    .toBe("```ts\nconst a = 1; // 고침\n```");
});

test("상세 본문을 저장하는 동안 편집기는 입력을 받지 않는다", async ({ page, workspace }) => {
  const id = await workspace.createIssue("저장 중 잠금 이슈", "--description", "저장할 문단");

  await page.goto(`/issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  await dialog.getByRole("button", { name: "편집", exact: true }).click();
  const editor = dialog.getByRole("textbox", { name: "설명" });
  await editor.getByText("저장할 문단").click();
  await page.keyboard.press("End");
  await page.keyboard.type(" 고침");
  const release = await holdServerActions(page);
  await page.keyboard.press("ControlOrMeta+Enter");

  await expect(editor).not.toBeEditable();
  release();
  await expect
    .poll(async () => (await workspace.showIssue(id)).description, { timeout: SAVE_TIMEOUT })
    .toBe("저장할 문단 고침");
});

test("상세 본문에 이미지 파일을 붙여 넣어도 본문에 들어가지 않는다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue(
    "이미지 붙여 넣기 이슈",
    "--description",
    "붙여 넣을 문단",
  );

  await page.goto(`/issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  await dialog.getByRole("button", { name: "편집", exact: true }).click();
  const editor = dialog.getByRole("textbox", { name: "설명" });
  await editor.getByText("붙여 넣을 문단").click();
  await page.keyboard.press("End");
  await editor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(
      new File([new Uint8Array([137, 80, 78, 71])], "그림.png", { type: "image/png" }),
    );
    element.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }));
  });
  await page.keyboard.type(" 고침");
  await page.keyboard.press("ControlOrMeta+Enter");

  await expect
    .poll(async () => (await workspace.showIssue(id)).description, { timeout: SAVE_TIMEOUT })
    .toBe("붙여 넣을 문단 고침");
});

/** 풀어 줄 때까지 Server Action 요청을 서버로 보내지 않고 붙잡아 둡니다. */
async function holdServerActions(page: Page): Promise<() => void> {
  let release = () => {};
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route(
    () => true,
    async (route) => {
      if (route.request().headers()["next-action"]) await released;
      await route.continue();
    },
  );
  return release;
}
