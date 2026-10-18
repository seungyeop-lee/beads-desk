import { afterEach, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { MarkdownEditor } from "./MarkdownEditor";

const DIAGRAM = "```mermaid\nflowchart LR\n  A[시작] -->|처리| B[완료]\n```";

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

test("편집하는 동안 테마가 바뀌어도 입력한 글자가 남고 모든 그림을 새 테마로 다시 그린다", async () => {
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

  document.documentElement.dataset.theme = "desk-dark";
  await expect
    .poll(() => diagramColors(screen.container).every((color, index) => color !== light[index]))
    .toBe(true);
  await expect.element(editor.getByText("저장 전 문단 고침")).toBeVisible();

  document.documentElement.removeAttribute("data-theme");
  await expect.poll(() => diagramColors(screen.container)).toEqual(light);
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

/** 그림이 그려진 블록마다 첫 노드의 채움 색을 돌려줍니다. */
function diagramColors(container: HTMLElement) {
  return Array.from(container.querySelectorAll(".milkdown-code-block .preview svg"), (svg) => {
    const node = svg.querySelector(".node rect");
    return node ? getComputedStyle(node).fill : "";
  });
}
