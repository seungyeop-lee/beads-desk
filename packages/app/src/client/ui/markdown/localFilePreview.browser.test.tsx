import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { tabMarkdownUrl } from "@/client/modules/markdown/application/markdownAddress";
import { koMessages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { LOCAL_FILES_PATH } from "@/shared/contract/localFiles";
import { MarkdownEditor } from "./MarkdownEditor";

const labels = koMessages.markdownEditor;
const DIFF = ["@@ -1,2 +1,2 @@", "-const before = 1;", "+const after = 2;", " unchanged"].join(
  "\n",
);
const LOG = "+ 이 줄은 로그라서 칠하지 않습니다\n두 번째 줄";

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
});

function renderReadOnly(value: string) {
  return render(
    <LocaleProvider locale="ko">
      <MarkdownEditor openAddress={tabMarkdownUrl} readOnly value={value} />
    </LocaleProvider>,
  );
}

test("diff·patch·log·txt 로컬 파일 링크 옆에만 접힌 미리보기 버튼을 두고, 펼치기 전에는 파일을 받지 않는다", async () => {
  const screen = await renderReadOnly(
    [
      "[변경 diff](/tmp/r/a.diff) [패치](/tmp/r/b.PATCH) [로그](</tmp/r/실행 기록.log>) [메모](C:\\r\\note.txt)",
      "",
      "[문서](/tmp/r/a.md) [그림](/tmp/r/a.png) [웹 diff](https://example.com/a.diff) [화면](/epics)",
    ].join("\n"),
  );

  for (const name of ["변경 diff", "패치", "로그", "메모"]) {
    const button = screen.getByRole("button", { name: labels.filePreview(name) });
    await expect.element(button).toHaveAttribute("aria-expanded", "false");
  }
  await expect.element(screen.getByRole("link", { name: "문서" })).toBeVisible();
  expect(screen.getByRole("button").elements()).toHaveLength(4);
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

  const diffButton = screen.getByRole("button", { name: labels.filePreview("변경 diff") });
  const logButton = screen.getByRole("button", { name: labels.filePreview("실행 로그") });
  await userEvent.click(logButton);
  await userEvent.click(diffButton);

  const diffContents = screen.getByRole("region", {
    name: labels.filePreviewContents("변경 diff"),
  });
  const logContents = screen.getByRole("region", { name: labels.filePreviewContents("실행 로그") });
  await expect.element(diffContents.getByText("+const after = 2;")).toBeVisible();
  await expect.element(logContents.getByText("두 번째 줄", { exact: false })).toBeVisible();
  await expect.element(diffButton).toHaveAttribute("aria-expanded", "true");
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

  await userEvent.click(diffButton);
  await expect.element(diffContents).not.toBeInTheDocument();
  await expect.element(diffButton).toHaveAttribute("aria-expanded", "false");
  await expect.element(logContents).toBeVisible();
  await expect.element(diffButton).toHaveFocus();
});

test("목록 항목의 링크를 펼치면 그 항목 안, 항목 글 아래에 내용이 보인다", async () => {
  files = { "/tmp/r/fix.patch": () => new Response(DIFF) };
  const screen = await renderReadOnly("- [패치](/tmp/r/fix.patch) 항목\n- 둘째 항목");

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("패치") }));

  const contents = screen.getByRole("region", { name: labels.filePreviewContents("패치") });
  await expect.element(contents.getByText("-const before = 1;")).toBeVisible();
  const [first, second] = screen.getByRole("listitem").elements();
  expect(first!.contains(contents.element())).toBe(true);
  const box = contents.element().getBoundingClientRect();
  expect(box.top).toBeGreaterThanOrEqual(first!.querySelector("p")!.getBoundingClientRect().bottom);
  expect(second!.getBoundingClientRect().top).toBeGreaterThanOrEqual(box.bottom);
});

test("diff는 추가·삭제 줄을 코드 블록 강조 색으로 칠하고, log는 칠하지 않고 원문 그대로 보인다", async () => {
  files = {
    "/tmp/r/a.diff": () => new Response(DIFF),
    "/tmp/r/run.log": () => new Response(LOG),
  };
  const screen = await renderReadOnly("[diff](/tmp/r/a.diff) [log](/tmp/r/run.log)");

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("diff") }));
  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("log") }));

  const diff = screen.getByRole("region", { name: labels.filePreviewContents("diff") });
  await expect.element(diff.getByText("+const after = 2;")).toBeVisible();
  const colorOf = (text: string) => getComputedStyle(diff.getByText(text).element()).color;
  const plain = getComputedStyle(diff.element()).color;
  expect(colorOf("+const after = 2;")).not.toBe(plain);
  expect(colorOf("-const before = 1;")).not.toBe(plain);
  expect(colorOf("+const after = 2;")).not.toBe(colorOf("-const before = 1;"));

  const log = screen.getByRole("region", { name: labels.filePreviewContents("log") });
  await expect.element(log.getByText("두 번째 줄", { exact: false })).toBeVisible();
  expect(log.element().querySelector("pre")?.textContent).toBe(LOG);
  expect(log.element().querySelectorAll("pre span")).toHaveLength(0);
});

test("최대 높이보다 긴 내용은 펼친 영역 안에서 스크롤하고, 다음 블록은 그 영역 아래에 놓인다", async () => {
  const lines = Array.from({ length: 400 }, (_, index) => `+line ${index}`).join("\n");
  files = { "/tmp/r/long.diff": () => new Response(lines) };
  const screen = await renderReadOnly("[긴 diff](/tmp/r/long.diff)\n\n다음 문단");

  await userEvent.click(screen.getByRole("button", { name: labels.filePreview("긴 diff") }));

  const contents = screen.getByRole("region", { name: labels.filePreviewContents("긴 diff") });
  await expect.element(contents.getByText("+line 399")).toBeVisible();
  const scroller = contents.element().querySelector("pre")!;
  expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);
  expect(scroller.getBoundingClientRect().height).toBeLessThan(window.innerHeight);
  expect(
    screen.getByText("다음 문단").element().getBoundingClientRect().top,
  ).toBeGreaterThanOrEqual(contents.element().getBoundingClientRect().bottom);
  // 마지막 줄까지 강조합니다.
  expect(getComputedStyle(contents.getByText("+line 399").element()).color).toBe(
    getComputedStyle(contents.getByText("+line 0").element()).color,
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
  const href = screen.getByRole("link", { name: "밖" }).element().getAttribute("href");
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
    screen.getByRole("link", { name: "큰 로그" }).element().getAttribute("href"),
  );
  expect(contents.element().querySelector("pre")).toBeNull();
});

test("편집 중에는 미리보기 버튼을 두지 않고 원문을 바꾸지 않는다", async () => {
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
  expect(changed).not.toHaveBeenCalled();
});
