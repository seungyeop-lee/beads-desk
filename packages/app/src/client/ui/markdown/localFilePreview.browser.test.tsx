import { Schema } from "@milkdown/kit/prose/model";
import { EditorState } from "@milkdown/kit/prose/state";
import { EditorView } from "@milkdown/kit/prose/view";
import { afterEach, beforeEach, expect, onTestFinished, test, vi } from "vitest";
import { type Locator, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { tabMarkdownUrl } from "@/client/modules/markdown/application/markdownAddress";
import { koMessages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { LOCAL_FILES_PATH } from "@/shared/contract/localFiles";
import { codeMirrorDom } from "./codeMirrorDom.testkit";
import { localFilePreview } from "./localFilePreview";
import { MarkdownEditor } from "./MarkdownEditor";

const labels = koMessages.markdownEditor;
const DIFF = ["@@ -1,2 +1,2 @@", "-const before = 1;", "+const after = 2;", " unchanged"].join(
  "\n",
);
/** 새 파일, 이름 변경, 수정이 든 git diff입니다. */
const MULTI_FILE_DIFF = [
  "diff --git a/src/new.ts b/src/new.ts",
  "new file mode 100644",
  "index 0000000..7f21bdc",
  "--- /dev/null",
  "+++ b/src/new.ts",
  "@@ -0,0 +1,2 @@",
  "+export const a = 1;",
  "+export const b = 2;",
  "diff --git a/src/old.css b/src/renamed.css",
  "similarity index 79%",
  "rename from src/old.css",
  "rename to src/renamed.css",
  "index db66599..3310d07 100644",
  "--- a/src/old.css",
  "+++ b/src/renamed.css",
  "@@ -1,3 +1,3 @@",
  " .file-preview pre {",
  "-  max-height: 20rem;",
  "+  max-height: 24rem;",
  "   overflow: auto;",
  "diff --git a/src/filePreview.ts b/src/filePreview.ts",
  "index a1b26a2..a267709 100644",
  "--- a/src/filePreview.ts",
  "+++ b/src/filePreview.ts",
  "@@ -8,5 +8,6 @@ export function filePreviewFormat(address: string) {",
  "   const path = localFilePathOf(address);",
  "-  return extension ? (FORMATS.get(extension) ?? null) : null;",
  "+  if (!extension) return null;",
  "+  return FORMATS.get(extension) ?? null;",
  " }",
  '-const label = "미리보기";',
  "-// 끝",
  '+const label = "파일 미리보기";',
  "+export default label;",
  "",
].join("\n");
const LOG = "+ 이 줄은 로그라서 칠하지 않습니다\n두 번째 줄";
const MARKDOWN = [
  "# 조사 결과",
  "",
  "- **굵게**와 *기울임*",
  "- [참고 문서](https://example.com/doc)와 `inlineCall()`",
  "",
  "```ts",
  "const answer = 42;",
  'const unit = "개";',
  "```",
].join("\n");

/** 경로마다 파일 API가 돌려줄 응답입니다. 없는 경로는 404입니다. */
let files: Record<string, () => Response> = {};
const requestedPaths: string[] = [];

beforeEach(() => {
  files = {};
  requestedPaths.length = 0;
  const original = globalThis.fetch;
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), location.href);
    if (url.pathname !== LOCAL_FILES_PATH) return original(input, init);
    const path = url.searchParams.get("path") ?? "";
    requestedPaths.push(path);
    return Promise.resolve(
      files[path]?.() ?? new Response("파일을 찾을 수 없습니다.", { status: 404 }),
    );
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-theme");
});

function renderReadOnly(value: string) {
  return render(
    <LocaleProvider locale="ko">
      <MarkdownEditor openAddress={tabMarkdownUrl} readOnly value={value} />
    </LocaleProvider>,
  );
}

test("diff·patch·md·log·txt 로컬 파일 링크만 접힌 미리보기 칩과 새 탭 아이콘 링크로 그리고, 펼치기 전에는 파일을 받지 않는다", async () => {
  const screen = await renderReadOnly(
    [
      "[변경 diff](/tmp/r/a.diff) [패치](/tmp/r/b.PATCH) [로그](</tmp/r/실행 기록.log>) [메모](C:\\r\\note.txt) [문서](/tmp/r/a.md)",
      "",
      "[그림](/tmp/r/a.png) [웹 diff](https://example.com/a.diff) [화면](/epics)",
    ].join("\n"),
  );

  for (const name of ["변경 diff", "패치", "로그", "메모", "문서"]) {
    const chip = screen.getByRole("button", { name: labels.filePreview(name) });
    await expect.element(chip).toHaveAttribute("aria-expanded", "false");
    const open = screen.getByRole("link", { name: labels.openInNewTab(name) });
    expect(open.element().getAttribute("href")).toBe(chip.element().getAttribute("href"));
    await expect.element(open).toHaveAttribute("target", "_blank");
  }
  expect(screen.getByRole("button").elements()).toHaveLength(5);
  // 칩이 아닌 링크도 로컬 파일과 외부 주소는 새 탭에서 열고, 앱 화면은 지금 탭에서 엽니다.
  for (const name of ["그림", "웹 diff"]) {
    await expect.element(screen.getByRole("link", { name })).toHaveAttribute("target", "_blank");
  }
  await expect.element(screen.getByRole("link", { name: "화면" })).not.toHaveAttribute("target");
  expect(screen.getByRole("region").elements()).toHaveLength(0);
  expect(requestedPaths).toEqual([]);
});

test("문장 중간의 링크를 펼치면 그 링크가 든 문단 바로 아래에 내용이 보이고, 한 문단의 링크마다 따로 펼치고 접는다", async () => {
  files = {
    "/tmp/r/a.diff": () => new Response(DIFF),
    "/tmp/r/run.log": () => new Response(LOG),
  };
  const screen = await renderReadOnly(
    "변경은 [변경 diff](/tmp/r/a.diff)에 있고 [실행 로그](/tmp/r/run.log)도 남겼습니다.\n\n다음 문단",
  );

  const diffChip = screen.getByRole("button", { name: labels.filePreview("변경 diff") });
  const logChip = screen.getByRole("button", { name: labels.filePreview("실행 로그") });
  await userEvent.click(logChip);
  await userEvent.click(diffChip);

  const diffContents = screen.getByRole("region", {
    name: labels.filePreviewContents("변경 diff"),
  });
  const logContents = screen.getByRole("region", { name: labels.filePreviewContents("실행 로그") });
  await expect.element(diffContents.getByText("const after = 2;")).toBeVisible();
  await expect.element(logContents.getByText("두 번째 줄", { exact: false })).toBeVisible();
  await expect.element(diffChip).toHaveAttribute("aria-expanded", "true");
  const sentence = screen
    .getByText(/도 남겼습니다/)
    .element()
    .closest("p")!;
  const next = screen.getByText("다음 문단").element();
  // 펼친 영역은 문장을 나누지 않고 문단 아래에 링크 순서대로 놓입니다.
  expect(sentence.textContent).toContain("변경은 변경 diff에 있고 실행 로그도 남겼습니다.");
  const [diffBox, logBox] = [diffContents, logContents].map((region) =>
    region.element().getBoundingClientRect(),
  );
  expect(diffBox!.top).toBeGreaterThanOrEqual(sentence.getBoundingClientRect().bottom);
  expect(logBox!.top).toBeGreaterThanOrEqual(diffBox!.bottom);
  expect(next.getBoundingClientRect().top).toBeGreaterThanOrEqual(logBox!.bottom);

  await userEvent.click(diffChip);
  await expect.element(diffContents).not.toBeInTheDocument();
  await expect.element(diffChip).toHaveAttribute("aria-expanded", "false");
  await expect.element(logContents).toBeVisible();
  await expect.element(diffChip).toHaveFocus();
});

test("칩에 focus를 두고 Enter나 Space를 누르면 펼치고 접는다", async () => {
  files = { "/tmp/r/a.diff": () => new Response(DIFF) };
  const screen = await renderReadOnly("[변경 diff](/tmp/r/a.diff)");
  const chip = screen.getByRole("button", { name: labels.filePreview("변경 diff") });
  const contents = screen.getByRole("region", { name: labels.filePreviewContents("변경 diff") });
  await expect.element(chip).toBeVisible();

  chip.element().focus();
  await userEvent.keyboard("{Enter}");
  await expect.element(contents.getByText("const after = 2;")).toBeVisible();
  await expect.element(chip).toHaveAttribute("aria-expanded", "true");
  expect(chip.element().getAttribute("aria-controls")).toBe(contents.element().id);

  await userEvent.keyboard(" ");
  await expect.element(contents).not.toBeInTheDocument();
  await expect.element(chip).toHaveAttribute("aria-expanded", "false");
  await expect.element(chip).toHaveFocus();
});

test("본문이 코드 블록으로 끝나도 칩을 한 번 누르면 펼친다", async () => {
  files = { "/tmp/r/a.diff": () => new Response(DIFF) };
  const screen = await renderReadOnly(
    ["[변경 diff](/tmp/r/a.diff)", "", "```ts", "const answer = 42;", "```"].join("\n"),
  );
  const chip = screen.getByRole("button", { name: labels.filePreview("변경 diff") });

  await userEvent.click(chip);

  const contents = screen.getByRole("region", { name: labels.filePreviewContents("변경 diff") });
  await expect.element(contents.getByText("const after = 2;")).toBeVisible();
  await expect.element(chip).toHaveAttribute("aria-expanded", "true");
});

test("펼친 링크 앞에 글자를 넣어도 그 링크는 펼친 채로 남는다", async () => {
  files = { "/tmp/r/a.diff": () => new Response(DIFF) };
  const view = mountPreview(["변경은 ", ["변경 diff", "/tmp/r/a.diff"], "에 있습니다."]);
  const chip = page.getByRole("button", { name: labels.filePreview("변경 diff") });
  const contents = page.getByRole("region", { name: labels.filePreviewContents("변경 diff") });
  await userEvent.click(chip);
  await expect.element(contents.getByText("const after = 2;")).toBeVisible();

  view.dispatch(view.state.tr.insertText("오늘 ", 1));

  await expect.element(chip).toHaveAttribute("aria-expanded", "true");
  await expect.element(contents.getByText("const after = 2;")).toBeVisible();
});

test("펼친 링크를 지우거나 미리보기가 없는 주소로 바꾸면 펼친 상태가 남지 않는다", async () => {
  files = {
    "/tmp/r/a.diff": () => new Response(DIFF),
    "/tmp/r/run.log": () => new Response(LOG),
  };
  // 두 링크를 붙여 두어, 지운 링크의 위치에 다음 링크가 오게 합니다.
  const view = mountPreview([
    ["변경 diff", "/tmp/r/a.diff"],
    ["실행 로그", "/tmp/r/run.log"],
  ]);
  const logChip = page.getByRole("button", { name: labels.filePreview("실행 로그") });
  await userEvent.click(page.getByRole("button", { name: labels.filePreview("변경 diff") }));
  await expect.element(page.getByRole("region")).toBeVisible();

  const diff = linkRange(view, "변경 diff");
  view.dispatch(view.state.tr.delete(diff.from, diff.to));

  await expect.element(page.getByRole("region")).not.toBeInTheDocument();
  await expect.element(logChip).toHaveAttribute("aria-expanded", "false");

  await userEvent.click(logChip);
  await expect.element(page.getByRole("region")).toBeVisible();
  const linkMark = (href: string) => view.state.schema.marks.link!.create({ href });
  const log = linkRange(view, "실행 로그");
  view.dispatch(view.state.tr.addMark(log.from, log.to, linkMark("/tmp/r/run.png")));

  await expect.element(page.getByRole("region")).not.toBeInTheDocument();
  await expect.element(logChip).not.toBeInTheDocument();
  view.dispatch(view.state.tr.addMark(log.from, log.to, linkMark("/tmp/r/run.log")));
  await expect.element(logChip).toHaveAttribute("aria-expanded", "false");
});

test("Cmd/Ctrl을 누른 채 칩을 누르면 펼치지 않고 브라우저 기본 동작에 맡긴다", async () => {
  const screen = await renderReadOnly("[변경 diff](/tmp/r/a.diff)");
  const chip = screen.getByRole("button", { name: labels.filePreview("변경 diff") });
  let defaultPrevented: boolean | undefined;
  // 칩이 기본 동작을 막지 않았는지 기록한 뒤, 테스트 브라우저가 실제로 새 탭을 열지 않게 막습니다.
  const recordClick = (event: MouseEvent) => {
    defaultPrevented = event.defaultPrevented;
    event.preventDefault();
  };
  document.addEventListener("click", recordClick);
  try {
    await userEvent.click(chip, { modifiers: ["ControlOrMeta"] });
  } finally {
    document.removeEventListener("click", recordClick);
  }

  expect(defaultPrevented).toBe(false);
  await expect.element(chip).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("region").elements()).toHaveLength(0);
});

test("칩의 chevron과 새 탭 아이콘은 칩 글자와 세로 중앙이 맞는다", async () => {
  const screen = await renderReadOnly("앞 글자 [변경 diff](/tmp/r/a.diff) 뒤 글자");
  const chipLocator = screen.getByRole("button", { name: labels.filePreview("변경 diff") });
  await expect.element(chipLocator).toBeVisible();
  const chip = chipLocator.element();
  const open = screen.getByRole("link", { name: labels.openInNewTab("변경 diff") }).element();
  const middle = (element: Element) => {
    const box = element.getBoundingClientRect();
    return (box.top + box.bottom) / 2;
  };

  const text = middle(chip.querySelector("span")!);
  expect(Math.abs(middle(chip.querySelector("svg")!) - text)).toBeLessThanOrEqual(1);
  expect(Math.abs(middle(open.querySelector("svg")!) - text)).toBeLessThanOrEqual(1);
});

test("좁은 너비에서 긴 파일 이름의 칩은 칩 안에서 줄을 넘기고 본문 밖으로 넘치지 않는다", async () => {
  const name = "리뷰에서 받은 변경 사항을 모두 담은 아주긴파일이름_without_spaces_v2";
  const screen = await render(
    <LocaleProvider locale="ko">
      <div style={{ width: 160 }}>
        <MarkdownEditor
          openAddress={tabMarkdownUrl}
          readOnly
          value={`앞 글자 [${name}](/tmp/r/review.diff) 뒤 글자`}
        />
      </div>
    </LocaleProvider>,
  );
  const chip = screen.getByRole("button", { name: labels.filePreview(name) });
  await expect.element(chip).toBeVisible();
  const paragraph = chip.element().closest("p")!;

  expect(chip.element().getClientRects().length).toBeGreaterThan(1);
  expect(paragraph.scrollWidth).toBeLessThanOrEqual(paragraph.clientWidth);
  const right = paragraph.getBoundingClientRect().right;
  for (const box of chip.element().getClientRects()) expect(box.right).toBeLessThanOrEqual(right);
});

test("링크 글자 일부만 굵게 써도 링크 하나는 칩 하나와 새 탭 아이콘 링크 하나로 보이고, 함께 펼치고 접는다", async () => {
  files = { "/tmp/r/x.diff": () => new Response(DIFF) };
  const screen = await renderReadOnly("[**리뷰** 변경.diff](/tmp/r/x.diff) 뒤 글자");

  const chip = screen.getByRole("button", { name: labels.filePreview("리뷰 변경.diff") });
  await expect.element(chip).toBeVisible();
  expect(screen.getByRole("button").elements()).toHaveLength(1);
  expect(
    screen.getByRole("link", { name: labels.openInNewTab("리뷰 변경.diff") }).elements(),
  ).toHaveLength(1);
  expect(screen.getByRole("link").elements()).toHaveLength(1);
  // 보이는 아이콘은 칩의 chevron 하나와 새 탭 아이콘 하나입니다.
  const paragraph = chip.element().closest("p")!;
  const shownIcons = [...paragraph.querySelectorAll("svg")].filter(
    (icon) => icon.getClientRects().length > 0,
  );
  expect(shownIcons).toHaveLength(2);

  await userEvent.click(screen.getByText("리뷰", { exact: true }));
  await expect.element(chip).toHaveAttribute("aria-expanded", "true");
  await expect
    .element(screen.getByRole("region", { name: labels.filePreviewContents("리뷰 변경.diff") }))
    .toBeVisible();
  await userEvent.click(screen.getByText("변경.diff", { exact: false }));
  await expect.element(chip).toHaveAttribute("aria-expanded", "false");
  await expect.element(chip).toHaveFocus();
});

test("목록 항목의 링크를 펼치면 그 항목 안, 항목 글 아래에 내용이 보인다", async () => {
  files = { "/tmp/r/fix.patch": () => new Response(DIFF) };
  const screen = await renderReadOnly("- [패치](/tmp/r/fix.patch) 항목\n- 둘째 항목");

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("패치") }));

  const contents = screen.getByRole("region", { name: labels.filePreviewContents("패치") });
  await expect.element(contents.getByText("const before = 1;")).toBeVisible();
  const [first, second] = screen.getByRole("listitem").elements();
  expect(first!.contains(contents.element())).toBe(true);
  const box = contents.element().getBoundingClientRect();
  expect(box.top).toBeGreaterThanOrEqual(first!.querySelector("p")!.getBoundingClientRect().bottom);
  expect(second!.getBoundingClientRect().top).toBeGreaterThanOrEqual(box.bottom);
});

test("diff는 추가·삭제 줄의 바탕을 서로 다른 색으로 칠하고, log는 칠하지 않고 원문 그대로 보인다", async () => {
  files = {
    "/tmp/r/a.diff": () => new Response(DIFF),
    "/tmp/r/run.log": () => new Response(LOG),
  };
  const screen = await renderReadOnly("[diff](/tmp/r/a.diff) [log](/tmp/r/run.log)");

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("diff") }));
  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("log") }));

  const diff = screen.getByRole("region", { name: labels.filePreviewContents("diff") });
  await expect.element(diff.getByText("const after = 2;")).toBeVisible();
  const background = (text: string) =>
    getComputedStyle(diff.getByText(text).element()).backgroundColor;
  const context = background("unchanged");
  expect(background("const after = 2;")).not.toBe(context);
  expect(background("const before = 1;")).not.toBe(context);
  expect(background("const after = 2;")).not.toBe(background("const before = 1;"));

  const log = screen.getByRole("region", { name: labels.filePreviewContents("log") });
  await expect.element(log.getByText("두 번째 줄", { exact: false })).toBeVisible();
  expect(log.element().querySelector("pre")?.textContent).toBe(LOG);
  expect(log.element().querySelectorAll("pre span")).toHaveLength(0);
});

test("여러 파일이 든 diff는 파일마다 경로, 배지, 추가·삭제 수를 머리 막대에 보인다", async () => {
  files = { "/tmp/r/multi.diff": () => new Response(MULTI_FILE_DIFF) };
  const screen = await renderReadOnly("[변경](/tmp/r/multi.diff)");

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("변경") }));

  const contents = screen.getByRole("region", { name: labels.filePreviewContents("변경") });
  for (const { path, badge, added, deleted } of [
    { path: "src/new.ts", badge: labels.diffBadges.new, added: 2, deleted: 0 },
    {
      path: "src/old.css → src/renamed.css",
      badge: labels.diffBadges.renamed,
      added: 1,
      deleted: 1,
    },
    { path: "src/filePreview.ts", badge: undefined, added: 4, deleted: 3 },
  ]) {
    const file = contents.getByRole("group", { name: path });
    await expect.element(file.getByText(path, { exact: true })).toBeVisible();
    await expect.element(file.getByText(`+${added} −${deleted}`)).toBeVisible();
    await expect.element(file.getByText(labels.diffLineCounts(added, deleted))).toBeInTheDocument();
    const badges = Object.values(labels.diffBadges).filter(
      (label) => file.getByText(label, { exact: true }).elements().length > 0,
    );
    expect(badges).toEqual(badge ? [badge] : []);
  }
});

test.each([360, 800])(
  "%ipx 너비에서 긴 경로와 세 자리 변경 줄 수가 있어도 배지와 줄 수는 스크롤 영역 안에 남는다",
  async (width) => {
    const from = `packages/app/src/${"long-directory/".repeat(6)}before.ts`;
    const to = `packages/app/src/${"long-directory/".repeat(6)}after.ts`;
    files = {
      "/tmp/r/long-path.diff": () =>
        new Response(
          [
            `diff --git a/${from} b/${to}`,
            "similarity index 50%",
            `rename from ${from}`,
            `rename to ${to}`,
            `--- a/${from}`,
            `+++ b/${to}`,
            `@@ -1,114 +1,123 @@ ${"longFunctionName".repeat(12)}`,
            ...Array.from({ length: 114 }, (_, index) => `-const before${index} = 1;`),
            ...Array.from({ length: 123 }, (_, index) => `+const after${index} = 2;`),
            "",
          ].join("\n"),
        ),
    };
    const screen = await render(
      <LocaleProvider locale="ko">
        <div style={{ width }}>
          <MarkdownEditor
            openAddress={tabMarkdownUrl}
            readOnly
            value="[긴 경로](/tmp/r/long-path.diff)"
          />
        </div>
      </LocaleProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: labels.filePreview("긴 경로") }));
    const contents = screen.getByRole("region", { name: labels.filePreviewContents("긴 경로") });
    const badge = contents.getByText(labels.diffBadges.renamed, { exact: true });
    await expect.element(badge).toBeVisible();
    const counts = contents.getByText("+123 −114", { exact: true });
    const scroller = contents.element().firstElementChild as HTMLElement;
    expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    const badgeTop = badge.element().getBoundingClientRect().top;
    scroller.scrollTop = 100;
    expect(badge.element().getBoundingClientRect().top).toBeCloseTo(badgeTop, 0);
    for (const theme of ["desk", "desk-dark"]) {
      document.documentElement.dataset.theme = theme;
      for (const offset of [0, scroller.scrollWidth]) {
        scroller.scrollLeft = offset;
        const view = scroller.getBoundingClientRect();
        for (const item of [badge, counts]) {
          const box = item.element().getBoundingClientRect();
          expect(box.left).toBeGreaterThanOrEqual(view.left);
          expect(box.right).toBeLessThanOrEqual(view.left + scroller.clientWidth);
          expect(box.bottom).toBeLessThanOrEqual(view.top + scroller.clientHeight);
        }
      }
    }
  },
);

test("diff 줄마다 hunk 시작 번호부터 센 옛·새 줄 번호와 부호를 보인다", async () => {
  files = { "/tmp/r/multi.diff": () => new Response(MULTI_FILE_DIFF) };
  const screen = await renderReadOnly("[변경](/tmp/r/multi.diff)");

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("변경") }));

  const file = screen.getByRole("group", { name: "src/filePreview.ts" });
  await expect.element(file).toBeVisible();
  expect(
    file
      .getByRole("row")
      .elements()
      .map((row) => [...row.querySelectorAll("td")].map((cell) => cell.textContent)),
  ).toEqual([
    ["", "", "", "@@ -8,5 +8,6 @@ export function filePreviewFormat(address: string) {"],
    ["8", "8", " ", "  const path = localFilePathOf(address);"],
    ["9", "", "-", "  return extension ? (FORMATS.get(extension) ?? null) : null;"],
    ["", "9", "+", "  if (!extension) return null;"],
    ["", "10", "+", "  return FORMATS.get(extension) ?? null;"],
    ["10", "11", " ", "}"],
    ["11", "", "-", 'const label = "미리보기";'],
    ["12", "", "-", "// 끝"],
    ["", "12", "+", 'const label = "파일 미리보기";'],
    ["", "13", "+", "export default label;"],
  ]);
});

test("짝이 되는 삭제·추가 줄은 바뀐 단어만 강조하고, 관계없는 줄에는 단어 강조가 없다", async () => {
  files = { "/tmp/r/multi.diff": () => new Response(MULTI_FILE_DIFF) };
  const screen = await renderReadOnly("[변경](/tmp/r/multi.diff)");

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("변경") }));

  const renamed = screen.getByRole("group", { name: "src/old.css → src/renamed.css" });
  await expect.element(renamed).toBeVisible();
  expect(marks(renamed, "max-height: 20rem;")).toEqual(["20rem"]);
  expect(marks(renamed, "max-height: 24rem;")).toEqual(["24rem"]);

  // 지운 return 줄은 바로 아래의 관계없는 if 줄을 건너뛰고, 그다음의 비슷한 return 줄과 짝을 짓습니다.
  const file = screen.getByRole("group", { name: "src/filePreview.ts" });
  expect(marks(file, "return extension ? (FORMATS.get(extension) ?? null) : null;")).toEqual([
    "extension ? (",
    ") : null",
  ]);
  expect(marks(file, "if (!extension) return null;")).toEqual([]);
  expect(marks(file, 'const label = "파일 미리보기";')).toEqual(["파일 "]);
  expect(marks(file, "// 끝")).toEqual([]);
  expect(marks(file, "export default label;")).toEqual([]);
  const mark = file.getByRole("mark").first().element();
  expect(getComputedStyle(mark).backgroundColor).not.toBe(
    getComputedStyle(mark.closest("td")!).backgroundColor,
  );
});

test("diff 줄에 든 HTML과 스크립트는 요소로 만들지 않고 글자로 보인다", async () => {
  const added = '<b>굵게</b><img src="x" onerror="window.__diffScript = true">';
  files = {
    "/tmp/r/page.diff": () => new Response(`@@ -1 +1 @@\n-<b>굵게</b>\n+${added}\n`),
  };
  const screen = await renderReadOnly("[페이지](/tmp/r/page.diff)");

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("페이지") }));

  const contents = screen.getByRole("region", { name: labels.filePreviewContents("페이지") });
  await expect.element(contents.getByText(added)).toBeVisible();
  expect(contents.element().querySelector("b, img")).toBeNull();
  expect((window as { __diffScript?: boolean }).__diffScript).toBeUndefined();
});

test("파일 diff가 없는 .diff 파일은 원문을 그대로 보이고, 줄의 부호에 따라 글자색만 입힌다", async () => {
  const text = "+ 더할 일\n- 뺄 일\n메모";
  files = { "/tmp/r/notes.diff": () => new Response(text) };
  const screen = await renderReadOnly("[메모](/tmp/r/notes.diff)");

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("메모") }));

  const contents = screen.getByRole("region", { name: labels.filePreviewContents("메모") });
  await expect.element(contents.getByText("+ 더할 일")).toBeVisible();
  const pre = contents.element().querySelector("pre")!;
  expect(pre.textContent).toBe(text);
  expect(contents.getByRole("table").elements()).toHaveLength(0);
  const colorOf = (line: string) => getComputedStyle(contents.getByText(line).element()).color;
  expect(colorOf("+ 더할 일")).not.toBe(getComputedStyle(pre).color);
  expect(colorOf("+ 더할 일")).not.toBe(colorOf("- 뺄 일"));
});

test("긴 hunk 머리 줄과 긴 줄은 잘리지 않고 펼친 영역 안에서 가로로 스크롤해 끝까지 볼 수 있다", async () => {
  const header = `@@ -1 +1 @@ export function ${"veryLongFunctionName".repeat(6)}(argument: string) {`;
  const line = `const message = "${"긴 문장이 이어집니다 ".repeat(12)}";`;
  files = {
    "/tmp/r/wide.diff": () =>
      new Response(
        ["--- a/wide.ts", "+++ b/wide.ts", header, "-const message = 1;", `+${line}`, ""].join(
          "\n",
        ),
      ),
  };
  const screen = await render(
    <LocaleProvider locale="ko">
      <div style={{ width: 360 }}>
        <MarkdownEditor
          openAddress={tabMarkdownUrl}
          readOnly
          value="[넓은 diff](/tmp/r/wide.diff)"
        />
      </div>
    </LocaleProvider>,
  );

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("넓은 diff") }));

  const contents = screen.getByRole("region", { name: labels.filePreviewContents("넓은 diff") });
  const headerCell = contents.getByText(header);
  await expect.element(headerCell).toBeVisible();
  const lineCell = contents.getByText(line).element();
  const scroller = contents.element().firstElementChild as HTMLElement;
  expect(scroller.tabIndex).toBe(0);
  expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
  // 칸 안에서 잘리지 않고, 스크롤 영역이 가장 긴 줄의 끝까지 닿습니다.
  for (const cell of [headerCell.element(), lineCell]) {
    expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth);
  }
  scroller.scrollLeft = scroller.scrollWidth;
  const view = scroller.getBoundingClientRect();
  for (const cell of [headerCell.element(), lineCell]) {
    const range = document.createRange();
    range.selectNodeContents(cell);
    expect(range.getBoundingClientRect().right).toBeLessThanOrEqual(view.right);
  }
  // 파일 머리 막대는 가로로 스크롤해도 보이는 폭 안에 남습니다.
  const path = contents.getByText("wide.ts", { exact: true }).element().getBoundingClientRect();
  expect(path.left).toBeGreaterThanOrEqual(view.left);
  expect(path.right).toBeLessThanOrEqual(view.right);
});

test("md는 렌더링하지 않은 원문을 펼쳐 markdown 구문과 코드 블록의 언어 토큰을 강조한다", async () => {
  files = { "/tmp/r/report.md": () => new Response(MARKDOWN) };
  const screen = await renderReadOnly("[보고서](/tmp/r/report.md)");

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("보고서") }));

  const contents = screen.getByRole("region", { name: labels.filePreviewContents("보고서") });
  await expect.element(contents.getByText("조사 결과", { exact: false })).toBeVisible();
  const pre = contents.element().querySelector("pre")!;
  expect(pre.textContent).toBe(MARKDOWN);
  expect(pre.querySelector("h1, strong, a")).toBeNull();
  const style = (text: string) => tokenStyle(pre.querySelectorAll("span"), text);
  const plain = getComputedStyle(pre).color;
  expect(style("조사 결과")).toMatchObject({ fontWeight: "700", textDecorationLine: "underline" });
  expect(style("굵게")).toMatchObject({ fontWeight: "700" });
  expect(style("기울임")).toMatchObject({ fontStyle: "italic" });
  expect(style("참고 문서")).toMatchObject({ textDecorationLine: "underline" });
  for (const text of ["https://example.com/doc", "inlineCall()", "-"]) {
    expect(style(text)?.color).not.toBe(plain);
  }
  // 코드 블록 안은 markdown이 아니라 TypeScript 토큰으로 나뉘어, 선언한 이름과 keyword가 다른 색입니다.
  for (const text of ["const", "answer", "42"]) {
    expect(style(text)?.color).not.toBe(plain);
  }
  expect(style("answer")!.color).not.toBe(style("const")!.color);
});

test("펼친 md 미리보기와 본문 코드 블록은 같은 토큰을 라이트·다크 테마에서 같은 색과 모양으로 칠한다", async () => {
  files = { "/tmp/r/report.md": () => new Response(MARKDOWN) };
  const tokenTexts = ["const", '"개"', "조사 결과"];
  const screen = await renderReadOnly(
    [
      "[보고서](/tmp/r/report.md)",
      "",
      "```markdown",
      "# 조사 결과",
      "```",
      "",
      "```ts",
      'const unit = "개";',
      "```",
    ].join("\n"),
  );
  const codeTokens = () => screen.container.querySelectorAll(codeMirrorDom.token);
  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("보고서") }));
  const contents = screen.getByRole("region", { name: labels.filePreviewContents("보고서") });
  await expect.element(contents.getByText("조사 결과", { exact: false })).toBeVisible();
  const previewTokens = () => contents.element().querySelectorAll("pre span");
  for (const text of tokenTexts) {
    await expect.poll(() => tokenStyle(codeTokens(), text)).toBeDefined();
  }

  for (const theme of ["light", "dark"]) {
    if (theme === "dark") document.documentElement.dataset.theme = "desk-dark";
    const plain = getComputedStyle(contents.element()).color;
    for (const text of tokenTexts) {
      const preview = tokenStyle(previewTokens(), text);
      expect({ theme, text, preview }).toEqual({
        theme,
        text,
        preview: tokenStyle(codeTokens(), text),
      });
      expect(preview).not.toMatchObject({ color: plain, fontWeight: "400" });
    }
  }
});

test("최대 높이보다 긴 내용은 펼친 영역 안에서 스크롤하고, 다음 블록은 그 영역 아래에 놓인다", async () => {
  const lines = Array.from({ length: 400 }, (_, index) => `+line ${index}`).join("\n");
  files = { "/tmp/r/long.diff": () => new Response(`@@ -0,0 +1,400 @@\n${lines}\n`) };
  const screen = await renderReadOnly("[긴 diff](/tmp/r/long.diff)\n\n다음 문단");

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("긴 diff") }));

  const contents = screen.getByRole("region", { name: labels.filePreviewContents("긴 diff") });
  const last = contents.getByText("line 399", { exact: true });
  await expect.element(last).toBeVisible();
  const scroller = contents.element().firstElementChild!;
  expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);
  expect(scroller.getBoundingClientRect().height).toBeLessThan(window.innerHeight);
  expect(
    screen.getByText("다음 문단").element().getBoundingClientRect().top,
  ).toBeGreaterThanOrEqual(contents.element().getBoundingClientRect().bottom);
  // 마지막 줄까지 칠합니다.
  expect(getComputedStyle(last.element()).backgroundColor).toBe(
    getComputedStyle(contents.getByText("line 0", { exact: true }).element()).backgroundColor,
  );
});

test("파일에 든 HTML과 스크립트는 요소로 만들지 않고 글자로 보인다", async () => {
  const html = '<b>굵게</b><img src="x" onerror="window.__previewScript = true">';
  files = { "/tmp/r/page.txt": () => new Response(html) };
  const screen = await renderReadOnly("[페이지](/tmp/r/page.txt)");

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("페이지") }));

  const contents = screen.getByRole("region", { name: labels.filePreviewContents("페이지") });
  await expect.element(contents).toHaveTextContent(html);
  expect(contents.element().querySelector("b, img")).toBeNull();
  expect((window as { __previewScript?: boolean }).__previewScript).toBeUndefined();
});

test("허용 범위 밖이거나 없는 파일을 펼치면 서버가 보낸 오류 문구가 보이고, 링크 주소는 그대로다", async () => {
  files = {
    "/etc/secret.log": () => new Response("허용 범위 밖의 파일입니다.", { status: 403 }),
  };
  const screen = await renderReadOnly("[밖](/etc/secret.log) [없음](/tmp/r/missing.txt)");

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("밖") }));
  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("없음") }));

  await expect
    .element(screen.getByRole("region", { name: labels.filePreviewContents("밖") }))
    .toHaveTextContent("허용 범위 밖의 파일입니다.");
  await expect
    .element(screen.getByRole("region", { name: labels.filePreviewContents("없음") }))
    .toHaveTextContent("파일을 찾을 수 없습니다.");
  const href = screen
    .getByRole("button", { name: labels.filePreview("밖") })
    .element()
    .getAttribute("href");
  expect(new URL(href!, location.href).searchParams.get("path")).toBe("/etc/secret.log");
});

test("1 MB를 넘는 파일을 펼치면 내용 대신 생략 문구와 파일을 여는 링크가 보인다", async () => {
  files = { "/tmp/r/huge.log": () => new Response("a".repeat(1024 * 1024 + 1)) };
  const screen = await renderReadOnly("[큰 로그](/tmp/r/huge.log)");

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("큰 로그") }));

  const contents = screen.getByRole("region", { name: labels.filePreviewContents("큰 로그") });
  await expect
    .element(contents.getByText(labels.filePreviewTooLarge(1), { exact: false }))
    .toBeVisible();
  const open = contents.getByRole("link", { name: labels.openFile });
  expect(open.element().getAttribute("href")).toBe(
    screen
      .getByRole("button", { name: labels.filePreview("큰 로그") })
      .element()
      .getAttribute("href"),
  );
  await expect.element(open).toHaveAttribute("target", "_blank");
  expect(contents.element().querySelector("pre")).toBeNull();
});

test("편집 중에는 칩과 새 탭 아이콘 링크를 두지 않고 원문을 바꾸지 않는다", async () => {
  const changed = vi.fn<(markdown: string) => void>();
  const markdown = "변경은 [변경 diff](/tmp/r/a.diff)에 있습니다.";
  const screen = await render(
    <LocaleProvider locale="ko">
      <MarkdownEditor
        openAddress={tabMarkdownUrl}
        value={markdown}
        label="설명"
        onChange={changed}
      />
    </LocaleProvider>,
  );

  await expect.element(screen.getByRole("link", { name: "변경 diff" })).toBeVisible();
  expect(
    screen.getByRole("button", { name: labels.filePreview("변경 diff") }).elements(),
  ).toHaveLength(0);
  expect(
    screen.getByRole("link", { name: labels.openInNewTab("변경 diff") }).elements(),
  ).toHaveLength(0);
  expect(changed).not.toHaveBeenCalled();
});

/**
 * 문단 하나에 글자와 링크를 차례로 넣은 문서에 plugin만 붙여 ProseMirror 편집기를 올립니다. 읽기 전용 본문에는 글자를 넣을 수
 * 없으므로, 펼친 상태가 문서 편집을 따라가는지는 이 편집기에 test가 transaction을 직접 보내 확인합니다.
 * 링크는 `[글자, 주소]`로 적고, 본문 편집기처럼 로컬 파일 API 주소로 그립니다.
 */
function mountPreview(parts: (string | [name: string, href: string])[]) {
  const schema = new Schema({
    nodes: {
      doc: { content: "paragraph+" },
      paragraph: { content: "text*", toDOM: () => ["p", 0] },
      text: {},
    },
    marks: {
      link: {
        attrs: { href: {} },
        inclusive: false,
        toDOM: (mark) => ["a", { href: tabMarkdownUrl(String(mark.attrs.href)) }, 0],
      },
    },
  });
  const link = schema.marks.link;
  const paragraph = schema.node(
    "paragraph",
    null,
    parts.map((part) =>
      typeof part === "string"
        ? schema.text(part)
        : schema.text(part[0], [link.create({ href: part[1] })]),
    ),
  );
  const place = document.body.appendChild(document.createElement("div"));
  const view = new EditorView(place, {
    state: EditorState.create({
      doc: schema.node("doc", null, [paragraph]),
      plugins: [localFilePreview(link, tabMarkdownUrl, labels)],
    }),
    editable: () => false,
  });
  onTestFinished(() => {
    view.destroy();
    place.remove();
  });
  return view;
}

/** 글자가 name인 링크의 문서 위치입니다. */
function linkRange(view: EditorView, name: string) {
  let range = { from: -1, to: -1 };
  view.state.doc.descendants((node, pos) => {
    if (node.text === name) range = { from: pos, to: pos + node.nodeSize };
  });
  return range;
}

/** 내용에 text가 든 diff 줄에서 단어 강조한 글자들입니다. */
function marks(file: Locator, text: string) {
  return file
    .getByRole("row")
    .filter({ hasText: text })
    .getByRole("mark")
    .elements()
    .map((mark) => mark.textContent);
}

/** 글자가 text인 첫 강조 토큰의 계산된 색과 모양입니다. 그런 토큰이 없으면 undefined입니다. */
function tokenStyle(tokens: Iterable<Element>, text: string) {
  const token = [...tokens].find((span) => span.textContent?.trim() === text);
  if (!token) return undefined;
  const { color, fontWeight, fontStyle, textDecorationLine } = getComputedStyle(token);
  return { color, fontWeight, fontStyle, textDecorationLine };
}
