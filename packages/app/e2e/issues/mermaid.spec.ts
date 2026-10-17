import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Locator } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { placeCaretAfter } from "../support/editorCaret";
import { createHumanGate } from "../support/humanGates";

const DIAGRAM = "flowchart LR\n  A[시작] -->|처리| B[완료]";
const markdown = (code = DIAGRAM) => `\`\`\`mermaid\n${code}\n\`\`\``;

// CodeMirror가 만든 입력 영역은 외부 편집기의 DOM이며, 바깥 ProseMirror와 별개로 편집합니다.
async function changeCode(block: Locator, content: string) {
  await block.locator(".cm-content").fill(content);
}

async function diagramColor(block: Locator) {
  return block
    .locator("svg .node rect")
    .first()
    .evaluate((node) => getComputedStyle(node).fill);
}

test("본문·댓글·활동의 그림에 한글 노드와 간선 글자가 보이고 여러 블록의 SVG id가 서로 다르다", async ({
  page,
  workspace,
}, info) => {
  const id = await workspace.createIssue(
    "Mermaid 읽기",
    "--description",
    `${markdown()}\n\n${markdown('flowchart LR\n A["시작<br/>준비"] -->|처리| B[완료]')}`,
  );
  await workspace.bd("comments", "add", id, markdown());
  await page.goto(`/issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  const blocks = dialog.locator(".milkdown-code-block");
  await expect(blocks.locator(".preview svg")).toHaveCount(3);
  for (const block of await blocks.all()) {
    await expect(block.locator(".cm-content")).toBeHidden();
    await expect(block.locator(".preview svg")).toContainText("시작");
    await expect(block.locator(".preview svg")).toContainText("처리");
    await expect(block.locator(".preview svg")).toContainText("완료");
    const labels = await block.locator(".preview svg foreignObject").evaluateAll((nodes) =>
      nodes.map((node) => ({
        text: node.textContent,
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
      })),
    );
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every((label) => label.text && label.width > 0 && label.height > 0)).toBe(true);
  }
  const diagrams = blocks.locator("[data-mermaid-preview] > svg");
  await expect(diagrams).toHaveCount(3);
  const ids = await diagrams.evaluateAll((diagrams) =>
    diagrams
      .flatMap((diagram) => [diagram, ...diagram.querySelectorAll("[id]")])
      .map((node) => node.id),
  );
  expect(new Set(ids).size).toBe(ids.length);
  await page.screenshot({ path: info.outputPath("mermaid-readonly-light.png"), fullPage: true });
  await dialog.getByRole("tab", { name: "활동" }).click();
  await expect(dialog.getByRole("tabpanel").locator(".preview svg")).toHaveCount(1);
});

test("편집 미리보기는 마지막 입력만 남기고 문법 오류·언어 변경 뒤에도 코드로 돌아오거나 회복된다", async ({
  page,
  workspace,
}, info) => {
  const id = await workspace.createIssue("Mermaid 편집", "--description", markdown());
  await page.goto(`/issues?issue=${id}`);
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
  await expect(page.locator("body > div > svg")).toHaveCount(0);
  await changeCode(block, DIAGRAM);
  await expect(block.locator(".preview svg")).toContainText("시작");
  await page.screenshot({ path: info.outputPath("mermaid-editor.png"), fullPage: true });
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

test("시스템 테마가 바뀌어도 저장 전 입력이 남고 여러 블록의 그림이 갱신된다", async ({
  page,
  workspace,
}, info) => {
  await page.emulateMedia({ colorScheme: "light" });
  const id = await workspace.createIssue(
    "Mermaid 테마",
    "--description",
    `${markdown()}\n\n${markdown()}\n\n저장 전 문단`,
  );
  await page.goto(`/issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  await expect(dialog.locator(".preview svg").first()).toBeVisible();
  await dialog.getByRole("button", { name: "편집", exact: true }).click();
  const editor = dialog.getByRole("textbox", { name: "설명", exact: true });
  await placeCaretAfter(editor, "저장 전 문단");
  await page.keyboard.type(" 고침");
  const block = editor.locator(".milkdown-code-block").first();
  await expect(block.locator(".preview svg")).toBeVisible();
  const light = await diagramColor(block);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => diagramColor(block)).not.toBe(light);
  await page.screenshot({ path: info.outputPath("mermaid-editor-dark.png"), fullPage: true });
  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => diagramColor(block)).toBe(light);
  await expect(editor.getByText("저장 전 문단 고침")).toBeVisible();
});

test("다른 문단만 저장하면 mermaid 원문의 fence·들여쓰기·줄바꿈이 bd에 그대로 남는다", async ({
  page,
  workspace,
}) => {
  const original = `앞 문단\n\n  ~~~~mermaid\n  flowchart LR\n    A[시작] -->|처리| B[완료]\n  ~~~~\n\n고칠 문단\n`;
  const id = await workspace.createIssue("Mermaid 원문 보존", "--description", original);
  await page.goto(`/issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  await expect(dialog.locator(".preview svg")).toBeVisible();
  await dialog.getByRole("button", { name: "편집", exact: true }).click();
  await placeCaretAfter(dialog.getByRole("textbox", { name: "설명" }), "고칠 문단");
  await page.keyboard.type(" 고침");
  await dialog.getByRole("button", { name: "저장", exact: true }).click();
  await expect
    .poll(async () => (await workspace.showIssue(id)).description, { timeout: SAVE_TIMEOUT })
    .toBe(original.replace("고칠 문단", "고칠 문단 고침"));
});

test("일반 코드에서는 Mermaid 모듈을 받지 않고 Mermaid 모듈 로드 실패 시 코드가 보인다", async ({
  page,
  workspace,
}) => {
  const { plain, mermaid } = await workspace.createIssues({
    plain: { title: "일반 코드", description: "```ts\nconst value = 1;\n```" },
    mermaid: { title: "모듈 로드 실패", description: markdown() },
  });
  const chunks = await mermaidChunks();
  const scripts = new Set<string>();
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.add(request.url());
  });
  await page.goto(`/issues?issue=${plain}`);
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

test("Human gate는 같은 그림을 보여 주고 설정에서 테마를 바꾸어도 작성 중인 응답이 남는다", async ({
  page,
  workspace,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  const work = await workspace.createIssue("Mermaid 검토 대상");
  await createHumanGate(workspace, work, markdown());
  await page.goto("/human");
  const report = page.getByRole("region", { name: `Review: ${work}`, exact: true });
  await expect(report.locator(".preview svg")).toContainText("시작");
  await expect(report.locator(".cm-content")).toBeHidden();
  const response = report.getByRole("textbox", { name: "응답", exact: true });
  await response.fill("저장하지 않은 응답");
  const block = report.locator(".milkdown-code-block").first();
  const light = await diagramColor(block);
  await page.getByRole("button", { name: "설정", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "설정", exact: true });
  const theme = settings.getByRole("combobox", { name: "테마", exact: true });
  await theme.selectOption("dark");
  await expect.poll(() => diagramColor(block)).not.toBe(light);
  await expect(response).toHaveText("저장하지 않은 응답");
  await theme.selectOption("light");
  await expect.poll(() => diagramColor(block)).toBe(light);
  await theme.selectOption("system");
  await expect.poll(() => diagramColor(block)).toBe(light);
  await expect(response).toHaveText("저장하지 않은 응답");
});

async function mermaidChunks() {
  const directory = join(process.cwd(), ".next/static/chunks");
  const files = await readdir(directory);
  const sources = await Promise.all(
    files
      .filter((file) => file.endsWith(".js"))
      .map(async (file) => ({ file, source: await readFile(join(directory, file), "utf8") })),
  );
  const chunks = sources
    .filter(({ source }) => source.includes("mermaidAPI"))
    .map(({ file }) => `/_next/static/chunks/${file}`);
  expect(chunks.length).toBeGreaterThan(0);
  return new Set(chunks);
}

test("모듈 응답이 늦어도 이미 다른 언어로 바꾼 블록에 이전 그림이 나타나지 않는다", async ({
  page,
  workspace,
}) => {
  const { plain, target } = await workspace.createIssues({
    plain: { title: "편집기 준비", description: "```ts\nconst value = 1;\n```" },
    target: {
      title: "늦은 그림",
      description: `${markdown()}\n\n${markdown("flowchart LR\n A[남은 그림] --> B")}`,
    },
  });
  await page.goto(`/issues?issue=${plain}`);
  const plainDialog = page.getByRole("dialog", { name: `${plain} 이슈` });
  await expect(plainDialog.getByText("const value = 1;", { exact: true })).toBeVisible();
  const chunks = await mermaidChunks();
  let started = false;
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_next/static/chunks/*.js", async (route) => {
    if (chunks.has(new URL(route.request().url()).pathname)) {
      started = true;
      await released;
    }
    await route.continue();
  });
  try {
    await plainDialog.getByRole("button", { name: "닫기", exact: true }).first().click();
    await page.getByRole("link", { name: "늦은 그림", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: `${target} 이슈` });
    await expect.poll(() => started).toBe(true);
    await dialog.getByRole("button", { name: "편집", exact: true }).click();
    const blocks = dialog
      .getByRole("textbox", { name: "설명", exact: true })
      .locator(".milkdown-code-block");
    const first = blocks.nth(0);
    await changeCode(first, "flowchart LR\n A[폐기할 입력] --> B");
    await first.getByRole("button", { name: /^mermaid$/i }).click();
    await page
      .getByRole("listitem")
      .filter({ hasText: /^JavaScript$/ })
      .click();
    release();
    await expect(blocks.nth(1).locator(".preview svg")).toContainText("남은 그림");
    await expect(first.locator(".preview-panel")).toHaveCount(0);
    await expect(first.locator(".cm-content")).toContainText("폐기할 입력");
  } finally {
    release();
  }
});

test("새 이슈 작성에서도 Mermaid 미리보기를 보여 주며 영어 미리보기 문구를 쓴다", async ({
  page,
  workspace,
}) => {
  await page.goto("/issues");
  await page.getByRole("button", { name: /^(설정|Settings)$/ }).click();
  const settings = page.getByRole("dialog", { name: /^(설정|Settings)$/ });
  await settings.getByRole("combobox", { name: /^(언어|Language)$/ }).selectOption("en");
  await settings.getByRole("button", { name: "Close", exact: true }).first().click();
  await page.getByRole("button", { name: "New issue", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New issue", exact: true });
  await dialog.getByRole("textbox", { name: "Title", exact: true }).fill("New Mermaid");
  const editor = dialog.getByRole("textbox", { name: "Description", exact: true });
  await editor.click();
  await editor.evaluate((element, text) => {
    const data = new DataTransfer();
    data.setData("text/plain", text);
    element.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, markdown());
  await expect(editor.locator(".preview svg")).toContainText("시작");
  await expect(editor.getByText("Preview", { exact: true })).toBeVisible();
  await expect(editor.getByRole("button", { name: "Hide code", exact: true })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page).toHaveURL(/[?&]issue=/);
  const created = new URL(page.url()).searchParams.get("issue") ?? "";
  await expect
    .poll(async () => (await workspace.showIssue(created)).description, { timeout: SAVE_TIMEOUT })
    .toBe(markdown());
});
