import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Locator } from "@playwright/test";
import { expect, SAVE_TIMEOUT, test } from "../support/bdWorkspace";
import { createHumanGate } from "../support/humanGates";

const DIAGRAM = "flowchart LR\n  A[시작] -->|처리| B[완료]";
const markdown = (code = DIAGRAM) => `\`\`\`mermaid\n${code}\n\`\`\``;

// CodeMirror가 만든 입력 영역은 외부 편집기의 DOM이며, 바깥 ProseMirror와 별개로 편집합니다.
async function changeCode(block: Locator, content: string) {
  await block.locator(".cm-content").fill(content);
}

async function diagramColor(block: Locator) {
  return block
    .locator("svg .pele-node rect")
    .first()
    .evaluate((node) => getComputedStyle(node).fill);
}

test("본문·댓글·활동의 그림에 한글 노드와 간선 글자가 보이고 여러 블록의 SVG id가 서로 다르다", async ({
  page,
  workspace,
}, info) => {
  // 접근성 제목은 SVG 안에 id로 들어가므로, 같은 제목의 그림을 여러 개 두어 id 충돌을 확인합니다.
  const titled = (code: string) => markdown(code.replace("\n", "\n  accTitle: 처리 흐름\n"));
  const id = await workspace.createIssue(
    "Mermaid 읽기",
    "--description",
    `${titled(DIAGRAM)}\n\n${titled('flowchart LR\n A["시작<br/>준비"] -->|처리| B[완료]')}`,
  );
  await workspace.bd("comments", "add", id, titled(DIAGRAM));
  await page.goto(`/issues?issue=${id}`);
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

test("Human gate는 같은 그림을 보여 주고 설정이나 시스템에서 테마를 바꾸어도 작성 중인 응답이 남는다", async ({
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
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => diagramColor(block)).not.toBe(light);
  await expect(response).toHaveText("저장하지 않은 응답");
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
  await page.goto("/issues");
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

test("본문·댓글·옆 패널의 그림을 누르거나 키보드로 크게 보고, Esc·닫기 단추·바깥 클릭으로 닫으면 상세로 돌아온다", async ({
  page,
  workspace,
}, info) => {
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
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`/issues?issue=${main}`);
  const dialog = page.getByRole("dialog", { name: `${main} 이슈` });
  const enlarged = page.getByRole("dialog", { name: "크게 본 그림", exact: true });
  const diagrams = dialog.getByRole("button", { name: "그림 크게 보기", exact: true });
  await expect(diagrams).toHaveCount(2);

  await diagrams.first().click();
  await expect(enlarged).toBeVisible();
  const width = async (locator: Locator) => (await locator.boundingBox())!.width;
  expect(await width(enlarged.locator("svg.pele"))).toBeGreaterThan(
    await width(diagrams.first().locator("svg")),
  );
  await expect(enlarged.locator(".pele-marker")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("mermaid-enlarged-light.png"),
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(enlarged).toBeHidden();
  await expect(dialog).toBeVisible();

  // 닫으면 브라우저가 그림에 초점을 돌려주므로, Tab으로 그림을 떠났다가 다시 돌아와 Enter로 엽니다.
  await expect(diagrams.first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(diagrams.first()).not.toBeFocused();
  await page.keyboard.press("Tab");
  await expect(diagrams.first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(enlarged).toBeVisible();
  await enlarged.getByRole("button", { name: "닫기", exact: true }).first().click();
  await expect(enlarged).toBeHidden();
  await expect(dialog).toBeVisible();

  await diagrams.nth(1).click();
  await expect(enlarged.locator("svg.pele")).toContainText("댓글 그림");
  await page.mouse.click(5, 5);
  await expect(enlarged).toBeHidden();
  await expect(dialog).toBeVisible();

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`/issues?issue=${main}&side=${dependency}`);
  const side = page.getByRole("region", { name: `${dependency} 이슈 옆 패널` });
  await side.getByRole("button", { name: "그림 크게 보기", exact: true }).click();
  await expect(enlarged.locator("svg.pele")).toContainText("선행 그림");
  await page.screenshot({
    path: info.outputPath("mermaid-enlarged-dark.png"),
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(enlarged).toBeHidden();
  await expect(side).toBeVisible();
});

test("설명을 편집하는 중에도 미리보기 그림을 크게 보고, 닫으면 편집 중인 내용이 남는다", async ({
  page,
  workspace,
}) => {
  const id = await workspace.createIssue("Mermaid 편집 확대", "--description", markdown());
  await page.goto(`/issues?issue=${id}`);
  const dialog = page.getByRole("dialog", { name: `${id} 이슈` });
  await dialog.getByRole("button", { name: "편집", exact: true }).click();
  const editor = dialog.getByRole("textbox", { name: "설명", exact: true });
  const block = editor.locator(".milkdown-code-block");
  await changeCode(block, "flowchart LR\n  A[고친 그림] --> B");
  await expect(block.locator(".preview svg")).toContainText("고친 그림");

  await block.getByRole("button", { name: "그림 크게 보기", exact: true }).click();
  const enlarged = page.getByRole("dialog", { name: "크게 본 그림", exact: true });
  await expect(enlarged.locator("svg.pele")).toContainText("고친 그림");
  await page.keyboard.press("Escape");
  await expect(enlarged).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect(block.locator(".cm-content")).toContainText("A[고친 그림]");
  await expect(dialog.getByRole("button", { name: "저장", exact: true })).toBeVisible();
});
