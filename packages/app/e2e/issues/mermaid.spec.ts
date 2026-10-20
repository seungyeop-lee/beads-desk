import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Locator } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";

const DIAGRAM = "flowchart LR\n  A[시작] -->|처리| B[완료]";
const markdown = (code = DIAGRAM) => `\`\`\`mermaid\n${code}\n\`\`\``;

// CodeMirror가 만든 입력 영역은 외부 편집기의 DOM이며, 바깥 ProseMirror와 별개로 편집합니다.
async function changeCode(block: Locator, content: string) {
  await block.locator(".cm-content").fill(content);
}

test("본문·댓글·활동의 그림에 한글 노드와 간선 글자가 보이고 여러 블록의 SVG id가 서로 다르다", async ({
  page,
  workspace,
}) => {
  // 접근성 제목은 SVG 안에 id로 들어가므로, 같은 제목의 그림을 여러 개 두어 id 충돌을 확인합니다.
  const titled = (code: string) => markdown(code.replace("\n", "\n  accTitle: 처리 흐름\n"));
  const id = await workspace.createIssue(
    "Mermaid 읽기",
    "--description",
    `${titled(DIAGRAM)}\n\n${titled('flowchart LR\n A["시작<br/>준비"] -->|처리| B[완료]')}`,
  );
  await workspace.bd("comments", "add", id, titled(DIAGRAM));
  await page.goto(`issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  const blocks = dialog.locator(".milkdown-code-block");
  await expect(blocks.locator(".preview svg")).toHaveCount(3);
  for (const block of await blocks.all()) {
    await expect(block.locator(".cm-content")).toBeHidden();
    await expect(block.locator(".preview svg")).toContainText("시작");
    await expect(block.locator(".preview svg")).toContainText("처리");
    await expect(block.locator(".preview svg")).toContainText("완료");
  }
  const diagrams = blocks.locator("[data-mermaid-preview] > svg");
  await expect(diagrams).toHaveCount(3);
  const ids = await diagrams.evaluateAll((diagrams) =>
    diagrams.flatMap((diagram) => Array.from(diagram.querySelectorAll("[id]"), (node) => node.id)),
  );
  expect(ids).toHaveLength(3);
  expect(new Set(ids).size).toBe(ids.length);
  await dialog.getByRole("tab", { name: "활동" }).click();
  await expect(dialog.getByRole("tabpanel").locator(".preview svg")).toHaveCount(1);
});

test("편집 미리보기는 마지막 입력만 남기고 문법 오류·언어 변경 뒤에도 코드로 돌아오거나 회복된다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("Mermaid 편집", "--description", markdown());
  await page.goto(`issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  await expect(dialog.locator(".preview svg")).toBeVisible();
  await dialog.getByRole("button", { name: "편집", exact: true }).click();
  const block = dialog
    .getByRole("textbox", { name: "설명", exact: true })
    .locator(".milkdown-code-block");
  await expect(block.locator(".cm-content")).toBeVisible();
  await expect(block.getByText("미리보기", { exact: true })).toBeVisible();
  await expect(block.getByRole("button", { name: "코드 숨기기" })).toBeVisible();
  await changeCode(block, "flowchart LR\n A[첫 입력] --> B");
  await changeCode(block, "flowchart LR\n A[둘째 입력] --> B");
  await changeCode(block, "flowchart LR\n A[마지막 입력] --> B");
  await expect(block.locator(".preview svg")).toContainText("마지막 입력");
  await expect(block.locator(".preview")).not.toContainText("첫 입력");
  await changeCode(block, "flowchart LR\n A[");
  await expect(block.locator(".preview-panel")).toHaveCount(0);
  await expect(block.locator(".cm-content")).toBeVisible();
  await changeCode(block, DIAGRAM);
  await expect(block.locator(".preview svg")).toContainText("시작");
  await block.getByRole("button", { name: /^mermaid$/i }).click();
  await page
    .getByRole("listitem")
    .filter({ hasText: /^JavaScript$/ })
    .click();
  await expect(block.locator(".preview-panel")).toHaveCount(0);
  await expect(block.locator(".cm-content")).toContainText("flowchart");
  await block.locator(".cm-content").click();
  await expect(block.locator(".cm-content")).toBeFocused();
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect
    .poll(async () => (await workspace.showIssue(id)).description, { timeout: SAVE_TIMEOUT })
    .toContain("```JavaScript");
  await expect(dialog.locator(".preview-panel")).toHaveCount(0);
});

test("일반 코드에서는 pele 모듈을 받지 않고 pele 모듈 로드 실패 시 코드가 보인다", async ({
  page,
  workspace,
}) => {
  const { plain, mermaid } = await workspace.createIssues({
    plain: { title: "일반 코드", description: "```ts\nconst value = 1;\n```" },
    mermaid: { title: "모듈 로드 실패", description: markdown() },
  });
  const chunks = await peleChunks();
  const scripts = new Set<string>();
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.add(request.url());
  });
  await page.goto(`issues?issue=${plain}`);
  const plainDialog = page.getByRole("dialog", { name: `${plain} 이슈` });
  await expect(plainDialog.getByText("const value = 1;", { exact: true })).toBeVisible();
  await expect(plainDialog.locator(".preview-panel")).toHaveCount(0);
  expect([...scripts].some((url) => chunks.has(new URL(url).pathname))).toBe(false);
  let blocked = 0;
  await page.route("**/_next/static/chunks/*.js", async (route) => {
    if (chunks.has(new URL(route.request().url()).pathname)) {
      blocked++;
      await route.abort();
    } else await route.continue();
  });
  await plainDialog.getByRole("button", { name: "닫기", exact: true }).first().click();
  await page.getByRole("link", { name: "모듈 로드 실패", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `${mermaid} 이슈` });
  await expect.poll(() => blocked).toBeGreaterThan(0);
  await expect(dialog.locator(".milkdown-code-block .cm-content")).toBeVisible();
  await expect(dialog.locator(".preview-panel")).toHaveCount(0);
  await expect(dialog.locator(".cm-content")).toContainText("flowchart LR");
});

async function peleChunks() {
  const directory = join(process.cwd(), ".next/static/chunks");
  const files = await readdir(directory);
  const sources = await Promise.all(
    files
      .filter((file) => file.endsWith(".js"))
      .map(async (file) => ({ file, source: await readFile(join(directory, file), "utf8") })),
  );
  const chunks = sources
    .filter(({ source }) => source.includes("No diagram type detected"))
    .map(({ file }) => `/_next/static/chunks/${file}`);
  expect(chunks.length).toBeGreaterThan(0);
  return new Set(chunks);
}

test("새 이슈 작성에서도 Mermaid 미리보기를 보여 주고 Ctrl/Cmd+Enter로 만들면 bd 설명에 저장된다", async ({
  page,
  workspace,
}) => {
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
  }, markdown());
  await expect(editor.locator(".preview svg")).toContainText("시작");
  await expect(editor.getByText("미리보기", { exact: true })).toBeVisible();
  await expect(editor.getByRole("button", { name: "코드 숨기기", exact: true })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page).toHaveURL(/[?&]issue=/);
  const created = new URL(page.url()).searchParams.get("issue") ?? "";
  await expect
    .poll(async () => (await workspace.showIssue(created)).description, { timeout: SAVE_TIMEOUT })
    .toBe(markdown());
});

test("본문·댓글·옆 패널의 그림을 눌러 크게 보고, Esc로 닫으면 상세로 돌아와 그림에 초점이 남는다", async ({
  page,
  workspace,
}) => {
  const { main, dependency } = await workspace.createIssues(
    {
      main: { title: "Mermaid 확대", type: "task", description: markdown() },
      dependency: {
        title: "Mermaid 선행",
        type: "task",
        description: markdown("flowchart LR\n  C[선행 그림] --> D[후속]"),
      },
    },
    [["main", "dependency"]],
  );
  await workspace.bd("comments", "add", main, markdown("flowchart LR\n  E[댓글 그림] --> F[답]"));
  await page.goto(`issues?issue=${main}`);
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  const enlarged = page.getByRole("dialog", { name: "크게 본 그림", exact: true });
  const diagrams = dialog.getByRole("button", { name: "그림 크게 보기", exact: true });
  await expect(diagrams).toHaveCount(2);

  await diagrams.first().click();
  await expect(enlarged.locator(".pele-marker")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(enlarged).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect(diagrams.first()).toBeFocused();

  await diagrams.nth(1).click();
  await expect(enlarged.locator("svg.pele")).toContainText("댓글 그림");

  await page.goto(`issues?issue=${main}&side=${dependency}`);
  const side = page.getByRole("region", { name: `${dependency} 이슈 옆 패널` });
  await side.getByRole("button", { name: "그림 크게 보기", exact: true }).click();
  await expect(enlarged.locator("svg.pele")).toContainText("선행 그림");
  await page.keyboard.press("Escape");
  await expect(enlarged).toBeHidden();
  await expect(side).toBeVisible();
});
