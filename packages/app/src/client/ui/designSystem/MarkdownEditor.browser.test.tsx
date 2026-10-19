import { foldCode } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { afterEach, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { codeEditorTheme, codeHighlighting } from "./codeHighlighting";
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

test("코드 블록의 강조 색과 편집기 표시 색이 참조하는 --code-* 변수는 밝은 테마와 어두운 테마 모두 코드 블록 안에서 값이 있다", async () => {
  const view = await renderCodeEditor(TYPESCRIPT);
  const names = codeVariableNames();
  expect(names).not.toHaveLength(0);

  const missing = inBothThemes(() => {
    const style = getComputedStyle(view.dom);
    return names.filter((name) => style.getPropertyValue(name).trim() === "");
  });
  expect(missing).toEqual({ light: [], dark: [] });
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

test("어두운 테마에서도 코드 블록의 현재 줄, 고른 글자, 괄호 짝 표시는 밝은 테마만큼 바탕과 구분되고, 그 위의 강조 토큰은 4.5:1 이상 대비된다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <MarkdownEditor value={TYPESCRIPT} label="설명" />
    </LocaleProvider>,
  );
  await expect.poll(() => tokenColor(screen.container, "return")).not.toBe("");
  const view = EditorView.findFromDOM(screen.container.querySelector<HTMLElement>(".cm-editor")!)!;
  const afterBracket = view.state.doc.toString().indexOf("create(") + "create(".length;
  view.focus();

  const light = await codeIndicators(view, afterBracket);
  // 밝은 테마는 CodeMirror 기본 테마의 색 그대로입니다.
  expect(light.colors).toEqual({
    activeLine: "rgba(204, 238, 255, 0.267)",
    selection: "rgb(215, 212, 240)",
    matchingBracket: "rgba(50, 140, 130, 0.32)",
  });

  document.documentElement.dataset.theme = "desk-dark";
  const dark = await codeIndicators(view, afterBracket);
  expect(dark.activeLine).toBeGreaterThanOrEqual(light.activeLine);
  expect(dark.selection).toBeGreaterThanOrEqual(light.selection);
  expect(dark.matchingBracket).toBeGreaterThanOrEqual(light.matchingBracket);
  const tokens = view.dom.querySelectorAll<HTMLElement>(".cm-activeLine span");
  expect(tokens.length).toBeGreaterThan(5);
  for (const token of tokens) {
    const color = getComputedStyle(token).color;
    expect(
      contrast(color, dark.selectedLine),
      `${token.textContent} ${color}`,
    ).toBeGreaterThanOrEqual(4.5);
  }
});

test("어두운 테마에서도 코드 블록의 같은 낱말 강조, 검색 결과 강조, snippet 입력 칸은 밝은 테마만큼 바탕과 구분되고, 그 위의 강조 토큰은 4.5:1 이상 대비된다", async () => {
  const view = await renderCodeEditor(TYPESCRIPT);
  const doc = view.state.doc.toString();

  const word = doc.indexOf("intent ");
  view.dispatch({ selection: { anchor: word, head: word + "intent".length } });
  const selectionMatch = await markOverText(view, ".cm-selectionMatch");

  view.dispatch({ selection: { anchor: 0 } });
  await userEvent.keyboard("{ControlOrMeta>}f{/ControlOrMeta}intent{Enter}");
  const searchMatch = await markOverText(view, ".cm-searchMatch:not(.cm-searchMatch-selected)");
  const currentSearchMatch = await markOverText(view, ".cm-searchMatch-selected");
  await userEvent.keyboard("{Escape}");

  await typeOnNewLastLine(view, "for");
  await userEvent.click(await completionOption(view));
  const snippetField = await markOverText(view, ".cm-snippetField");

  const marks = { selectionMatch, searchMatch, currentSearchMatch, snippetField };
  // 밝은 테마는 CodeMirror 기본 테마의 색 그대로입니다.
  expect(
    Object.fromEntries(Object.entries(marks).map(([name, mark]) => [name, mark.light.color])),
  ).toEqual({
    selectionMatch: "rgba(153, 255, 119, 0.5)",
    searchMatch: "rgba(255, 255, 0, 0.33)",
    currentSearchMatch: "rgba(255, 106, 0, 0.33)",
    snippetField: "rgba(0, 0, 0, 0.133)",
  });
  for (const [name, { light, dark }] of Object.entries(marks)) {
    expect(dark.distinction, `${name} 바탕 구분`).toBeGreaterThanOrEqual(light.distinction);
    expect(dark.text, `${name} 위의 글자`).toBeGreaterThanOrEqual(4.5);
  }
});

test("어두운 테마에서도 코드 블록의 caret과 끌어 놓을 자리 표시는 코드 블록 바탕과 3:1 이상 대비된다", async () => {
  const view = await renderCodeEditor(TYPESCRIPT);
  view.dispatch({ selection: { anchor: 0 } });
  const target = view.coordsAtPos(view.state.doc.toString().indexOf("Retry"))!;
  view.contentDOM.dispatchEvent(
    new DragEvent("dragover", {
      clientX: target.left + 1,
      clientY: (target.top + target.bottom) / 2,
      bubbles: true,
      dataTransfer: new DataTransfer(),
    }),
  );
  await expect.poll(() => view.dom.querySelector(".cm-cursor")).not.toBeNull();
  await expect.poll(() => view.dom.querySelector(".cm-dropCursor")).not.toBeNull();

  const cursors = inBothThemes(() => {
    const background = getComputedStyle(view.dom).backgroundColor;
    const caret = getComputedStyle(view.dom.querySelector(".cm-cursor")!).borderLeftColor;
    const dropCursor = getComputedStyle(view.dom.querySelector(".cm-dropCursor")!).borderLeftColor;
    return {
      colors: { caret, dropCursor },
      caret: contrast(caret, background),
      dropCursor: contrast(dropCursor, background),
    };
  });
  // 밝은 테마는 CodeMirror 기본 테마의 색 그대로입니다.
  expect(cursors.light.colors).toEqual({ caret: "rgb(0, 0, 0)", dropCursor: "rgb(0, 0, 0)" });
  expect(cursors.dark.caret).toBeGreaterThanOrEqual(3);
  expect(cursors.dark.dropCursor).toBeGreaterThanOrEqual(3);
});

test("어두운 테마에서도 코드 블록의 자동 완성 목록은 밝은 테마만큼 바탕과 구분되고, 고르지 않은 항목의 글자는 4.5:1 이상 대비된다", async () => {
  const view = await renderCodeEditor(TYPESCRIPT);
  await typeOnNewLastLine(view, "con");
  await completionOption(view);

  const tooltip = inBothThemes(() => {
    const background = getComputedStyle(view.dom).backgroundColor;
    const box = getComputedStyle(view.dom.querySelector(".cm-tooltip-autocomplete")!);
    const item = getComputedStyle(
      view.dom.querySelector(".cm-tooltip-autocomplete li:not([aria-selected])")!,
    ).color;
    return {
      colors: { background: box.backgroundColor, border: box.borderTopColor, item },
      editorText: getComputedStyle(view.dom).color,
      box: contrast(box.backgroundColor, background),
      border: contrast(box.borderTopColor, background),
      item: contrast(item, box.backgroundColor),
    };
  });
  // 밝은 테마는 CodeMirror 기본 테마의 색 그대로이고, 기본 테마는 글자색을 정하지 않아 편집기 글자색을 물려받습니다.
  expect(tooltip.light.colors).toEqual({
    background: "rgb(245, 245, 245)",
    border: "rgb(187, 187, 187)",
    item: tooltip.light.editorText,
  });
  expect(tooltip.dark.box).toBeGreaterThanOrEqual(tooltip.light.box);
  expect(tooltip.dark.border).toBeGreaterThanOrEqual(3);
  expect(tooltip.dark.item).toBeGreaterThanOrEqual(4.5);
});

test("어두운 테마에서도 코드 블록의 접힌 코드 자리 표시는 밝은 테마만큼 바탕과 구분되고, 그 안의 글자는 4.5:1 이상 대비된다", async () => {
  const view = await renderCodeEditor(TYPESCRIPT);
  view.dispatch({ selection: { anchor: view.state.doc.line(3).from } });
  expect(foldCode(view)).toBe(true);
  await expect.poll(() => view.dom.querySelector(".cm-foldPlaceholder")).not.toBeNull();

  const fold = inBothThemes(() => {
    const background = getComputedStyle(view.dom).backgroundColor;
    const activeLine = getComputedStyle(view.dom.querySelector(".cm-activeLine")!).backgroundColor;
    const placeholder = getComputedStyle(view.dom.querySelector(".cm-foldPlaceholder")!);
    const line = paint(background, activeLine);
    const fill = paint(background, activeLine, placeholder.backgroundColor);
    return {
      colors: {
        background: placeholder.backgroundColor,
        border: placeholder.borderTopColor,
        text: placeholder.color,
      },
      box: contrast(fill, line),
      border: contrast(placeholder.borderTopColor, background),
      text: contrast(placeholder.color, fill),
    };
  });
  // 밝은 테마는 CodeMirror 기본 테마의 색 그대로입니다.
  expect(fold.light.colors).toEqual({
    background: "rgb(238, 238, 238)",
    border: "rgb(221, 221, 221)",
    text: "rgb(136, 136, 136)",
  });
  expect(fold.dark.box).toBeGreaterThanOrEqual(fold.light.box);
  expect(fold.dark.border).toBeGreaterThanOrEqual(3);
  expect(fold.dark.text).toBeGreaterThanOrEqual(4.5);
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

/**
 * 코드 블록의 커서를 at에 두어 현재 줄과 괄호 짝 표시를, at 앞 열 글자를 골라 선택 영역을 그린 뒤 각 바탕색을 읽습니다.
 * 표시마다 바로 아래 바탕과의 대비율을 돌려줍니다. 현재 줄 바탕은 반투명이라 선택 영역 위에 겹쳐 칠합니다.
 */
async function codeIndicators(view: EditorView, at: number) {
  const background = getComputedStyle(view.dom).backgroundColor;
  view.dispatch({ selection: { anchor: at } });
  await expect.poll(() => view.dom.querySelector(".cm-matchingBracket")).not.toBeNull();
  const activeLine = getComputedStyle(view.dom.querySelector(".cm-activeLine")!).backgroundColor;
  const matchingBracket = getComputedStyle(
    view.dom.querySelector(".cm-matchingBracket")!,
  ).backgroundColor;
  view.dispatch({ selection: { anchor: at - 10, head: at } });
  await expect
    .poll(() => view.dom.querySelector(".cm-selectionLayer .cm-selectionBackground"))
    .not.toBeNull();
  const selection = getComputedStyle(
    view.dom.querySelector(".cm-selectionLayer .cm-selectionBackground")!,
  ).backgroundColor;

  const line = paint(background, activeLine);
  const selectedLine = paint(background, selection, activeLine);
  return {
    colors: { activeLine, selection, matchingBracket },
    selectedLine,
    activeLine: contrast(line, background),
    selection: contrast(selectedLine, line),
    matchingBracket: contrast(paint(background, activeLine, matchingBracket), line),
  };
}

/** 코드 블록을 편집 상태로 그리고, 구문 강조가 끝난 뒤 포커스를 둔 코드 블록 편집기를 돌려줍니다. */
async function renderCodeEditor(value: string) {
  const screen = await render(
    <LocaleProvider locale="ko">
      <MarkdownEditor value={value} label="설명" />
    </LocaleProvider>,
  );
  await expect.poll(() => tokenColor(screen.container, "return")).not.toBe("");
  const view = EditorView.findFromDOM(screen.container.querySelector<HTMLElement>(".cm-editor")!)!;
  view.focus();
  return view;
}

/**
 * codeHighlighting.ts의 구문 강조(codeHighlighting)와 편집기 테마(codeEditorTheme)가 참조하는 --code-* 변수 이름입니다.
 * 이름을 테스트에 손으로 다시 적으면 CSS와 어긋나는 일이 테스트에서도 생기므로, 두 확장이 만드는 CSS 규칙에서 읽습니다.
 */
function codeVariableNames() {
  const view = new EditorView({ extensions: [codeHighlighting, codeEditorTheme] });
  const rules = view.state
    .facet(EditorView.styleModule)
    .map((module) => module.getRules())
    .join("\n");
  view.destroy();
  return [...new Set(Array.from(rules.matchAll(/var\((--code-[\w-]+)\)/g), ([, name]) => name!))];
}

/** 코드 끝에 빈 줄을 더하고 그 줄에 text를 입력합니다. 입력하는 동안 자동 완성 목록이 저절로 열립니다. */
async function typeOnNewLastLine(view: EditorView, text: string) {
  const end = view.state.doc.length;
  view.dispatch({ changes: { from: end, insert: "\n" }, selection: { anchor: end + 1 } });
  await userEvent.keyboard(text);
}

/** 열린 자동 완성 목록의 첫 항목입니다. 목록이 열릴 때까지 기다립니다. */
async function completionOption(view: EditorView) {
  await expect.poll(() => view.dom.querySelector(".cm-tooltip-autocomplete li")).not.toBeNull();
  return view.dom.querySelector<HTMLElement>(".cm-tooltip-autocomplete li")!;
}

/** 열어 둔 화면을 밝은 테마와 어두운 테마에서 차례로 읽습니다. 테마를 바꿔도 편집기를 다시 만들지 않으므로 열린 표시가 그대로 남습니다. */
function inBothThemes<T>(read: () => T) {
  document.documentElement.removeAttribute("data-theme");
  const light = read();
  document.documentElement.dataset.theme = "desk-dark";
  const dark = read();
  document.documentElement.removeAttribute("data-theme");
  return { light, dark };
}

/**
 * 글자 위에 칠하는 표시(selector)가 나타나기를 기다린 뒤, 두 테마에서 그 바탕색을 읽습니다.
 * distinction은 현재 줄 바탕과 표시를 겹친 색이 현재 줄 바탕과 이루는 대비율이고,
 * text는 코드 블록의 글자색과 강조 토큰 색 가운데 표시 위에서 대비가 가장 낮은 값입니다.
 */
async function markOverText(view: EditorView, selector: string) {
  await expect.poll(() => view.dom.querySelector(selector)).not.toBeNull();
  return inBothThemes(() => {
    const background = getComputedStyle(view.dom).backgroundColor;
    const activeLine = getComputedStyle(view.dom.querySelector(".cm-activeLine")!).backgroundColor;
    const color = getComputedStyle(view.dom.querySelector(selector)!).backgroundColor;
    const marked = paint(background, activeLine, color);
    const textColors = [view.dom, ...view.dom.querySelectorAll(".cm-line span")].map(
      (element) => getComputedStyle(element).color,
    );
    return {
      color,
      distinction: contrast(marked, paint(background, activeLine)),
      text: Math.min(...textColors.map((text) => contrast(text, marked))),
    };
  });
}

/** 색을 차례로 겹쳐 칠한 결과입니다. 반투명한 표시 색을 그 아래 바탕과 합친 색을 구할 때 씁니다. */
function paint(...colors: string[]) {
  const context = document.createElement("canvas").getContext("2d")!;
  for (const color of colors) {
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
  }
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
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
