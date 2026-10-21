/// <reference types="@vitest/browser-playwright" />
import { foldCode } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import type { FormEvent } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { LOCAL_FILES_PATH } from "@/shared/contract/localFiles";
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

/** 로컬 파일 API 주소이면 그 주소가 여는 경로를, 아니면 null을 돌려줍니다. */
function localPath(url: string | null) {
  const parsed = new URL(url ?? "", location.href);
  return parsed.pathname === LOCAL_FILES_PATH ? parsed.searchParams.get("path") : null;
}

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

test("드라이브 문자로 시작하는 Windows 절대경로의 링크와 이미지는 로컬 파일 API 주소로 그리고, 허용하지 않는 scheme의 링크 주소는 비운다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <MarkdownEditor
        readOnly
        value={
          "[슬래시 문서](C:/x/y.md) ![역슬래시 그림](C:\\x\\y.png) [공백 문서](<d:\\work\\조사 결과.md>) [스크립트](javascript:alert(1))"
        }
      />
    </LocaleProvider>,
  );

  const image = screen.getByRole("img", { name: "역슬래시 그림" });
  await expect.element(image).toBeInTheDocument();
  expect(localPath(image.element().getAttribute("src"))).toBe("C:\\x\\y.png");
  const links = [
    ["슬래시 문서", "C:/x/y.md"],
    ["공백 문서", "d:\\work\\조사 결과.md"],
  ];
  for (const [name, path] of links) {
    const href = screen.getByRole("link", { name }).element().getAttribute("href");
    expect(localPath(href)).toBe(path);
  }
  expect(screen.getByText("스크립트").element().closest("a")?.getAttribute("href")).toBe("");
});

test("Windows 경로의 문장부호 앞 역슬래시는 CommonMark escape로 지우지 않고 로컬 파일 API 주소에 그대로 담는다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <MarkdownEditor
        readOnly
        value={"[a](C:\\work\\.beads\\a.md) ![밑줄 그림](C:\\a_b\\_x.png)"}
      />
    </LocaleProvider>,
  );

  const link = screen.getByRole("link", { name: "a" });
  await expect.element(link).toBeInTheDocument();
  expect(localPath(link.element().getAttribute("href"))).toBe("C:\\work\\.beads\\a.md");
  const image = screen.getByRole("img", { name: "밑줄 그림" }).element();
  expect(localPath(image.getAttribute("src"))).toBe("C:\\a_b\\_x.png");
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

test("어두운 테마에서도 코드 블록의 줄 이동 dialog에 있는 go 버튼의 글자는 눌렀을 때도 버튼 바탕과 4.5:1 이상 대비된다", async () => {
  const view = await renderCodeEditor(TYPESCRIPT);
  const { goButton } = await openLineDialogWithSearch(view);
  const read = () => {
    const button = getComputedStyle(goButton);
    const panel = getComputedStyle(goButton.closest(".cm-panel")!);
    const stops = Array.from(button.backgroundImage.matchAll(/rgba?\([^)]*\)/g), ([stop]) => stop);
    return {
      colors: {
        background: button.backgroundImage,
        border: `${button.borderTopWidth} ${button.borderTopStyle} ${button.borderTopColor}`,
        text: button.color,
      },
      panelText: panel.color,
      text: Math.min(
        ...stops.map((stop) => contrast(button.color, paint(panel.backgroundColor, stop))),
      ),
    };
  };

  const idle = inBothThemes(read);
  const pressed = await whilePressing(goButton, () => inBothThemes(read));

  // 밝은 테마는 CodeMirror 기본 테마의 모양 그대로이고, 기본 테마는 글자색을 정하지 않아 panel 글자색을 물려받습니다.
  expect(idle.light.colors).toEqual({
    background: "linear-gradient(rgb(239, 241, 245), rgb(217, 217, 223))",
    border: "1px solid rgb(136, 136, 136)",
    text: idle.light.panelText,
  });
  expect(pressed.light.colors.background).toBe(
    "linear-gradient(rgb(180, 180, 180), rgb(208, 211, 214))",
  );
  expect(idle.dark.text).toBeGreaterThanOrEqual(4.5);
  expect(pressed.dark.text).toBeGreaterThanOrEqual(4.5);
});

test("코드 블록의 줄 이동 dialog에 있는 닫기 버튼은 두 테마 모두 검색 panel의 닫기 버튼처럼 테두리 없이 그려진다", async () => {
  const view = await renderCodeEditor(TYPESCRIPT);
  const { closeButton, searchCloseButton } = await openLineDialogWithSearch(view);
  const shape = (element: Element) => {
    const style = getComputedStyle(element);
    return {
      border: `${style.borderTopWidth} ${style.borderTopStyle}`,
      background: style.backgroundColor,
      text: style.color,
      font: `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
    };
  };

  const close = inBothThemes(() => ({
    dialog: shape(closeButton),
    search: shape(searchCloseButton),
  }));
  expect(close.light.dialog.border).toBe("0px none");
  expect(close.light.dialog).toEqual(close.light.search);
  expect(close.dark.dialog).toEqual(close.dark.search);
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

test("그려진 그림만 눌러 크게 볼 수 있고, 크게 본 그림은 원래 그림과 id가 겹치지 않으며 두 테마에서 원래 그림과 같은 색을 쓴다", async () => {
  const titled = DIAGRAM.replace("flowchart LR\n", "flowchart LR\n  accTitle: 처리 흐름\n");
  const screen = await render(
    <LocaleProvider locale="ko">
      <MarkdownEditor
        readOnly
        value={`\`\`\`mermaid\nzenuml\n  사용자->서버.요청()\n\`\`\`\n\n\`\`\`ts\nconst value = 1;\n\`\`\`\n\n${titled}`}
      />
    </LocaleProvider>,
  );
  await expect.poll(() => diagramColors(screen.container)).toHaveLength(1);
  const [unsupported, plain] = screen.container.querySelectorAll<HTMLElement>(".cm-content");
  await userEvent.click(unsupported!);
  await userEvent.click(plain!);
  expect(document.querySelector("dialog")).toBeNull();

  await screen.getByRole("button", { name: "그림 크게 보기" }).click();
  const dialog = page.getByRole("dialog", { name: "크게 본 그림" });
  await expect.element(dialog).toBeVisible();
  const original = screen.container.querySelector<SVGSVGElement>(".preview svg")!;
  const enlarged = dialog.element().querySelector<SVGSVGElement>("svg.pele")!;
  expect(enlarged.getBoundingClientRect().width).toBeGreaterThan(
    original.getBoundingClientRect().width,
  );
  const ids = (svg: SVGSVGElement) => Array.from(svg.querySelectorAll("[id]"), (node) => node.id);
  expect(ids(enlarged)).toHaveLength(1);
  expect(ids(original)).not.toContain(ids(enlarged)[0]);
  expect(enlarged.getAttribute("aria-labelledby")).toBe(ids(enlarged)[0]);

  const colors = () =>
    [original, enlarged].map((svg) => getComputedStyle(svg.querySelector(".pele-node rect")!).fill);
  const [light] = colors();
  expect(colors()).toEqual([light, light]);
  document.documentElement.dataset.theme = "desk-dark";
  const [dark] = colors();
  expect(dark).not.toBe(light);
  expect(colors()).toEqual([dark, dark]);
});

test("편집기를 감싼 form과 dialog는 그림 dialog를 Esc, 닫기 단추, 바깥 클릭으로 닫아도 제출되거나 닫히지 않고, 입력한 글자가 남는다", async () => {
  const submitted = vi.fn<(event: FormEvent) => void>((event) => event.preventDefault());
  const cancelled = vi.fn<() => void>();
  const closed = vi.fn<() => void>();
  const screen = await render(
    <LocaleProvider locale="ko">
      <dialog onCancel={cancelled} onClose={closed}>
        <form onSubmit={submitted}>
          <MarkdownEditor value={`${DIAGRAM}\n\n저장 전 문단`} label="설명" />
        </form>
      </dialog>
    </LocaleProvider>,
  );
  const host = screen.container.querySelector("dialog")!;
  host.showModal();
  const editor = screen.getByRole("textbox", { name: "설명" });
  await editor.getByText("저장 전 문단").click();
  await userEvent.keyboard("{End} 고침");
  const button = screen.getByRole("button", { name: "그림 크게 보기" });
  const dialog = page.getByRole("dialog", { name: "크게 본 그림" });

  await button.click();
  await expect.element(dialog).toBeVisible();
  await userEvent.keyboard("{Escape}");
  await expect.element(dialog).not.toBeInTheDocument();

  (button.element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
  await dialog.getByRole("button", { name: "닫기" }).first().click();
  await expect.element(dialog).not.toBeInTheDocument();

  (button.element() as HTMLElement).focus();
  await userEvent.keyboard(" ");
  await dialog.element().querySelector<HTMLElement>(".modal-backdrop button")!.click();
  await expect.element(dialog).not.toBeInTheDocument();

  expect(host.open).toBe(true);
  expect(submitted).not.toHaveBeenCalled();
  expect(cancelled).not.toHaveBeenCalled();
  expect(closed).not.toHaveBeenCalled();
  await expect.element(editor.getByText("저장 전 문단 고침")).toBeVisible();
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

/** 코드 블록에서 검색 panel을 연 뒤 줄 이동 dialog(Mod-Alt-g)를 열고, 두 panel의 버튼을 돌려줍니다. */
async function openLineDialogWithSearch(view: EditorView) {
  view.dispatch({ selection: { anchor: 0 } });
  await userEvent.keyboard("{ControlOrMeta>}f{/ControlOrMeta}");
  await expect.poll(() => view.dom.querySelector(".cm-search")).not.toBeNull();
  view.focus();
  await userEvent.keyboard("{ControlOrMeta>}{Alt>}g{/Alt}{/ControlOrMeta}");
  await expect.poll(() => view.dom.querySelector(".cm-dialog")).not.toBeNull();
  return {
    goButton: view.dom.querySelector<HTMLElement>(".cm-dialog form button.cm-button")!,
    closeButton: view.dom.querySelector<HTMLElement>(".cm-dialog-close")!,
    searchCloseButton: view.dom.querySelector<HTMLElement>(".cm-search [name=close]")!,
  };
}

/**
 * element 가운데에서 마우스 왼쪽 단추를 누른 채로 read를 실행합니다. :active 모양은 실제로 누르고 있는 동안에만 계산되므로 CDP로 누릅니다.
 * 테스트는 iframe 안에서 실행되므로, CDP에 넘기는 좌표에 iframe의 위치를 더합니다. 누른 단추는 element 밖에서 떼어 click이 일어나지 않게 합니다.
 */
async function whilePressing<T>(element: HTMLElement, read: () => T) {
  const frame = window.frameElement!.getBoundingClientRect();
  const box = element.getBoundingClientRect();
  const mouse = (type: "mousePressed" | "mouseReleased", x: number, y: number) =>
    cdp().send("Input.dispatchMouseEvent", {
      type,
      x: frame.left + x,
      y: frame.top + y,
      button: "left",
      clickCount: 1,
    });
  await mouse("mousePressed", box.left + box.width / 2, box.top + box.height / 2);
  try {
    await expect.poll(() => element.matches(":active")).toBe(true);
    return read();
  } finally {
    await mouse("mouseReleased", 0, 0);
  }
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
