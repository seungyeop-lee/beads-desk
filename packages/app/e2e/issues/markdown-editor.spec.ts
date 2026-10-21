import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { placeCaretAfter } from "../support/editorCaret";

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
  "  ~~~~mermaid",
  "  flowchart LR",
  "    A[시작] -->|처리| B[완료]",
  "  ~~~~",
  "",
  "고칠 문단",
  "",
  "[1]: https://example.com/doc",
].join("\n");

test("상세 본문을 저장 단추로 저장하면 고친 문단 말고는 mermaid 블록까지 원문 글자 그대로 bd에 저장된다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("본문 편집 이슈", "--description", ORIGINAL);

  await page.goto(`issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  await dialog.getByRole("button", { name: "편집", exact: true }).click();
  await placeCaretAfter(dialog.getByRole("textbox", { name: "설명" }), "고칠 문단");
  await page.keyboard.type(" 고침");
  await dialog.getByRole("button", { name: "저장", exact: true }).click();

  await expect
    .poll(async () => (await workspace.showIssue(id)).description, { timeout: SAVE_TIMEOUT })
    .toBe(ORIGINAL.replace("고칠 문단", "고칠 문단 고침"));
});

test("새 이슈 창의 설명에 붙여 넣은 mermaid 블록은 Ctrl/Cmd+Enter로 만들면 원문 그대로 bd 설명에 저장되고, 주소에 만든 이슈가 붙는다", async ({
  page,
  workspace,
}) => {
  const mermaid = "```mermaid\nflowchart LR\n  A[시작] -->|처리| B[완료]\n```";

  await page.goto("issues");
  await page.getByRole("button", { name: "새 이슈", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "새 이슈", exact: true });
  await dialog.getByRole("textbox", { name: "제목", exact: true }).fill("새 Mermaid");
  const editor = dialog.getByRole("textbox", { name: "설명", exact: true });
  await editor.click();
  await editor.evaluate((element, text) => {
    const data = new DataTransfer();
    data.setData("text/plain", text);
    element.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, mermaid);
  await page.keyboard.press("ControlOrMeta+Enter");

  await expect(page).toHaveURL(/[?&]issue=/);
  const created = new URL(page.url()).searchParams.get("issue") ?? "";
  await expect
    .poll(async () => (await workspace.showIssue(created)).description, { timeout: SAVE_TIMEOUT })
    .toBe(mermaid);
});
