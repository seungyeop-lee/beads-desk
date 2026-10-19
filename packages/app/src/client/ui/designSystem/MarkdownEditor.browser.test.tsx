import { afterEach, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { MarkdownEditor } from "./MarkdownEditor";

const DIAGRAM = "```mermaid\nflowchart LR\n  A[시작] -->|처리| B[완료]\n```";
const TYPESCRIPT = [
  "```ts",
  "// 결제 의도를 만듭니다",
  'import * as stripe from "stripe";',
  "export async function createIntent(planId: string): Promise<string> {",
  '  const intent = await stripe.paymentIntents.create({ amount: price(planId), currency: "usd" });',
  "  const pattern = /^pi_\\w+$/; let retried = false; const attempts = 5;",
  "  class Retry extends Error {}",
  "  return intent.client_secret!;",
  "}",
  "```",
].join("\n");
/** CodeMirror 기본 강조(defaultHighlightStyle)가 키워드에 쓰는 #708입니다. */
const LIGHT_KEYWORD = "rgb(119, 0, 136)";

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
});

test("읽기 전용 편집기는 markdown을 서식대로 그리고, 원문 HTML은 요소로 만들지 않는다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <MarkdownEditor
        readOnly
        value={"## 조사 결과\n\n- 첫 항목\n\n`bd-code`\n\n<b>원문 HTML</b>"}
      />
    </LocaleProvider>,
  );

  await expect.element(screen.getByRole("heading", { name: "조사 결과" })).toBeVisible();
  await expect.element(screen.getByRole("listitem")).toHaveTextContent("첫 항목");
  await expect.element(screen.getByRole("code")).toHaveTextContent("bd-code");
  expect(screen.container.textContent).not.toContain("##");
  expect(screen.container.textContent).toContain("<b>원문 HTML</b>");
  expect(screen.container.querySelector("b")).toBeNull();
});

test("제목으로 시작하는 본문은 읽을 때도 편집할 때도 글자를 고르는 동안 움직이지 않는다", async () => {
  const body = "### 배경\n\n드래그해서 고를 문단입니다.";
  for (const readOnly of [true, false]) {
    const screen = await render(
      <LocaleProvider locale="ko">
        <MarkdownEditor readOnly={readOnly} value={body} label="설명" focusOnCreate />
      </LocaleProvider>,
    );
    const heading = screen.getByRole("heading", { name: "배경" });
    await expect.element(heading).toBeVisible();
    const before = heading.element().getBoundingClientRect().top;

    selectStartOf(screen.getByText("드래그해서 고를 문단입니다.").element());
    await nextFrame();

    expect(String(window.getSelection())).not.toBe("");
    expect(heading.element().getBoundingClientRect().top).toBe(before);
    await screen.unmount();
  }
});

test("편집하는 동안 테마가 바뀌어도 입력한 글자가 남고, 모든 그림이 다시 그려지지 않은 채 새 테마의 색을 따른다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <MarkdownEditor value={`${DIAGRAM}\n\n${DIAGRAM}\n\n저장 전 문단`} label="설명" />
    </LocaleProvider>,
  );
  const editor = screen.getByRole("textbox", { name: "설명" });
  await editor.getByText("저장 전 문단").click();
  await userEvent.keyboard("{End} 고침");
  await expect.poll(() => diagramColors(screen.container)).toHaveLength(2);
  const light = diagramColors(screen.container);
  const diagrams = Array.from(screen.container.querySelectorAll(".preview svg"));

  document.documentElement.dataset.theme = "desk-dark";
  await expect
    .poll(() => diagramColors(screen.container).every((color, index) => color !== light[index]))
    .toBe(true);
  await expect.element(editor.getByText("저장 전 문단 고침")).toBeVisible();

  document.documentElement.removeAttribute("data-theme");
  await expect.poll(() => diagramColors(screen.container)).toEqual(light);
  await expect.element(editor.getByText("저장 전 문단 고침")).toBeVisible();
  expect(diagrams.every((diagram) => diagram.isConnected)).toBe(true);
});

test("어두운 테마에서 코드 블록의 모든 강조 토큰은 블록 바탕과 4.5:1 이상 대비된다", async () => {
  document.documentElement.dataset.theme = "desk-dark";
  const screen = await render(
    <LocaleProvider locale="ko">
      <MarkdownEditor readOnly value={TYPESCRIPT} />
    </LocaleProvider>,
  );
  await expect.poll(() => tokenColor(screen.container, "return")).not.toBe("");
  const background = getComputedStyle(
    screen.container.querySelector(".milkdown-code-block")!,
  ).backgroundColor;

  const tokens = screen.container.querySelectorAll<HTMLElement>(".cm-line span");
  expect(tokens.length).toBeGreaterThan(20);
  for (const token of tokens) {
    const color = getComputedStyle(token).color;
    expect(contrast(color, background), `${token.textContent} ${color}`).toBeGreaterThanOrEqual(
      4.5,
    );
  }
});

test("편집하는 동안 테마가 바뀌어도 입력한 글자가 남고, 코드 블록을 다시 만들지 않은 채 강조 색이 새 테마를 따른다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <MarkdownEditor value={`${TYPESCRIPT}\n\n저장 전 문단`} label="설명" />
    </LocaleProvider>,
  );
  const editor = screen.getByRole("textbox", { name: "설명" });
  await editor.getByText("저장 전 문단").click();
  await userEvent.keyboard("{End} 고침");
  await expect.poll(() => tokenColor(screen.container, "return")).toBe(LIGHT_KEYWORD);
  const code = screen.container.querySelector(".cm-content")!;

  document.documentElement.dataset.theme = "desk-dark";
  const background = getComputedStyle(
    screen.container.querySelector(".milkdown-code-block")!,
  ).backgroundColor;
  expect(contrast(tokenColor(screen.container, "return"), background)).toBeGreaterThanOrEqual(4.5);
  await expect.element(editor.getByText("저장 전 문단 고침")).toBeVisible();

  document.documentElement.removeAttribute("data-theme");
  expect(tokenColor(screen.container, "return")).toBe(LIGHT_KEYWORD);
  await expect.element(editor.getByText("저장 전 문단 고침")).toBeVisible();
  expect(code.isConnected).toBe(true);
});

test("그림의 한글 라벨은 노드 상자 안에 들어가고, 지원하지 않는 종류의 그림은 코드로 보인다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <MarkdownEditor
        readOnly
        value={`\`\`\`mermaid\nzenuml\n  사용자->서버.요청()\n\`\`\`\n\n${DIAGRAM}`}
      />
    </LocaleProvider>,
  );
  await expect.poll(() => diagramColors(screen.container)).toHaveLength(1);
  const [unsupported, diagram] = screen.container.querySelectorAll(".milkdown-code-block");

  expect(unsupported!.querySelector(".preview-panel")).toBeNull();
  await expect.element(unsupported!.querySelector<HTMLElement>(".cm-content")).toBeVisible();
  const nodes = diagram!.querySelectorAll(".preview svg .pele-node");
  expect(nodes).toHaveLength(2);
  for (const node of nodes) {
    const box = node.querySelector("rect")!.getBoundingClientRect();
    const label = node.querySelector("text")!.getBoundingClientRect();
    expect(label.width).toBeGreaterThan(0);
    expect(label.left).toBeGreaterThanOrEqual(box.left);
    expect(label.right).toBeLessThanOrEqual(box.right);
  }
});

/** 사용자가 끌어서 고를 때처럼 문단 앞부분을 고르고, 편집기가 그 선택을 바로 읽게 selectionchange를 보냅니다. */
function selectStartOf(paragraph: Element) {
  const text = paragraph.firstChild!;
  window.getSelection()!.setBaseAndExtent(text, 0, text, 5);
  document.dispatchEvent(new Event("selectionchange"));
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/** 그림이 그려진 블록마다 첫 노드의 채움 색을 돌려줍니다. */
function diagramColors(container: HTMLElement) {
  return Array.from(container.querySelectorAll(".milkdown-code-block .preview svg"), (svg) => {
    const node = svg.querySelector(".pele-node rect");
    return node ? getComputedStyle(node).fill : "";
  });
}

/** 코드 블록에서 글자가 text인 첫 강조 토큰의 글자 색입니다. 언어를 불러와 강조하기 전에는 빈 문자열입니다. */
function tokenColor(container: HTMLElement, text: string) {
  const token = Array.from(container.querySelectorAll(".cm-line span")).find(
    (span) => span.textContent === text,
  );
  return token ? getComputedStyle(token).color : "";
}

/** 두 색의 WCAG 대비율입니다. */
function contrast(a: string, b: string) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter! + 0.05) / (darker! + 0.05);
}

/** 색을 캔버스에 칠해 sRGB 값으로 바꾼 뒤 구한 WCAG 상대 휘도입니다. */
function luminance(color: string) {
  const context = document.createElement("canvas").getContext("2d")!;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = Array.from(context.getImageData(0, 0, 1, 1).data, (value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
