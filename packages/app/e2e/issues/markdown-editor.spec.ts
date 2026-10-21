import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
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

test("일반 코드만 있는 상세는 pele chunk를 받지 않고, pele chunk를 받지 못하면 mermaid 블록에 그림 대신 코드가 보인다", async ({
  page,
  workspace,
}) => {
  const { plain, mermaid } = await workspace.createIssues({
    plain: { title: "일반 코드", description: "```ts\nconst value = 1;\n```" },
    mermaid: {
      title: "pele 로드 실패",
      description: "```mermaid\nflowchart LR\n  A[시작] --> B[완료]\n```",
    },
  });
  const chunks = await peleChunks();
  const scripts = new Set<string>();
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.add(new URL(request.url()).pathname);
  });

  await page.goto(`issues?issue=${plain}`);
  const plainDialog = page.getByRole("dialog", { name: `${plain} 이슈` });
  await expect(plainDialog.getByText("const value = 1;", { exact: true })).toBeVisible();
  expect([...scripts].filter((script) => chunks.has(script))).toEqual([]);

  let blocked = 0;
  await page.route("**/_next/static/chunks/*.js", async (route) => {
    if (chunks.has(new URL(route.request().url()).pathname)) {
      blocked++;
      await route.abort();
    } else await route.continue();
  });
  await page.goto(`issues?issue=${mermaid}`);
  const dialog = page.getByRole("dialog", { name: `${mermaid} 이슈` });
  await expect.poll(() => blocked).toBeGreaterThan(0);
  await expect(dialog.locator(".preview-panel")).toHaveCount(0);
  const code = dialog.locator(".cm-content");
  await expect(code).toBeVisible();
  await expect(code).toContainText("flowchart LR");
});

/**
 * production build에서 pele module이 들어간 chunk의 주소를 모읍니다. chunk 파일 이름은 build마다 바뀌므로,
 * pele가 그림 종류를 알아내지 못할 때 던지는 오류 문구가 든 파일을 찾습니다.
 */
async function peleChunks(): Promise<Set<string>> {
  const directory = join(process.cwd(), ".next/static/chunks");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".js"));
  const peleFiles: string[] = [];
  for (const file of files) {
    if ((await readFile(join(directory, file), "utf8")).includes("No diagram type detected"))
      peleFiles.push(`/_next/static/chunks/${file}`);
  }
  expect(peleFiles.length).toBeGreaterThan(0);
  return new Set(peleFiles);
}
