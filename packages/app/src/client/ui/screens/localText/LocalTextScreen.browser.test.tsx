import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { ViewerLayoutFixture } from "@/client/ui/shell/AppLayoutFixture.testkit";
import { LOCAL_FILES_PATH, LOCAL_TEXT_SCREEN_PATH } from "@/shared/contract/localFiles";
import { LocalTextScreen } from "./LocalTextScreen";

const text = messages.localText;
const GUIDE = "/repo/docs/guide.md";
const NOTES = "/repo/logs/run notes.txt";
// 주소의 path와 파일 API가 돌려줄 응답을 테스트마다 바꿉니다. 응답이 없는 경로는 404입니다.
const screenState = vi.hoisted(() => ({ path: "", files: {} as Record<string, () => Response> }));

vi.mock("next/navigation", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock({
    screenPath: "/text",
    search: () => new URLSearchParams({ path: screenState.path }),
  }),
);

beforeEach(() => {
  screenState.path = GUIDE;
  screenState.files = {};
  const original = globalThis.fetch;
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), location.href);
    if (url.pathname !== LOCAL_FILES_PATH) return original(input, init);
    const path = url.searchParams.get("path") ?? "";
    return Promise.resolve(
      screenState.files[path]?.() ?? new Response("파일을 찾을 수 없습니다.", { status: 404 }),
    );
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function serve(path: string, contents: string) {
  screenState.files[path] = () => new Response(contents);
}

function openScreen(path: string) {
  screenState.path = path;
  return render(
    <LocaleProvider locale="ko">
      <ViewerLayoutFixture viewer="text">
        <LocalTextScreen />
      </ViewerLayoutFixture>
    </LocaleProvider>,
  );
}

const contents = () => page.getByRole("region", { name: text.contents });

/** 원문 열기 링크가 path 파일의 파일 API 주소를 새 탭에서 여는지 확인합니다. */
async function expectOpenRaw(path: string) {
  const open = page.getByRole("link", { name: text.openRaw });
  await expect.element(open).toHaveAttribute("target", "_blank");
  const href = new URL(open.element().getAttribute("href")!, location.href);
  expect(href.pathname).toBe(LOCAL_FILES_PATH);
  expect(href.searchParams.get("path")).toBe(path);
}

test("머리글에 텍스트 뷰어 이름을, 제목 줄에 파일 이름을 보인다", async () => {
  serve(GUIDE, "# 안내");
  await openScreen(GUIDE);

  await expect
    .element(page.getByRole("banner").getByText(messages.shell.viewers.text))
    .toBeVisible();
  await expect.element(page.getByRole("heading", { level: 1 })).toHaveTextContent("guide.md");
  await expectOpenRaw(GUIDE);
});

test("마크다운 파일은 렌더링하고, 상대 경로 그림과 링크는 문서가 든 폴더를 기준으로 연다", async () => {
  serve(
    GUIDE,
    [
      "# 사용 안내",
      "",
      "![구성도](img/a.png)",
      "",
      "[다음 문서](../README.md) [설명](<./my%20notes.txt#끝>) [웹](https://example.com/a.md)",
    ].join("\n"),
  );
  await openScreen(GUIDE);

  await expect.element(contents().getByRole("heading", { name: "사용 안내" })).toBeVisible();
  // 그림은 img 요소가 파일 API에 직접 요청하므로, 실제로 보이는지는 e2e가 확인합니다.
  const image = contents().getByRole("img", { name: "구성도" });
  await expect.element(image).toBeInTheDocument();
  const src = new URL(image.element().getAttribute("src")!, location.href);
  expect(src.pathname).toBe(LOCAL_FILES_PATH);
  expect(src.searchParams.get("path")).toBe("/repo/docs/img/a.png");

  for (const [name, path] of [
    ["다음 문서", "/repo/README.md"],
    ["설명", "/repo/docs/my notes.txt"],
  ]) {
    const link = contents().getByRole("link", { name, exact: true });
    await expect.element(link).toHaveAttribute("target", "_blank");
    const href = new URL(link.element().getAttribute("href")!, location.href);
    expect(href.pathname.endsWith(LOCAL_TEXT_SCREEN_PATH)).toBe(true);
    expect(href.searchParams.get("path")).toBe(path);
  }
  await expect
    .element(contents().getByRole("link", { name: "웹" }))
    .toHaveAttribute("href", "https://example.com/a.md");
});

test("텍스트 파일은 마크다운 문법과 HTML도 렌더링하지 않고 원문 그대로 보인다", async () => {
  const raw = "# 제목이 아닌 줄\n<b>굵게 하지 않음</b>\n  들여 쓴 줄";
  serve(NOTES, raw);
  await openScreen(NOTES);

  const pre = contents().element().querySelector("pre");
  await expect.poll(() => pre?.textContent).toBe(raw);
  expect(contents().element().querySelector("b, h1")).toBeNull();
});

test("빈 파일은 빈 파일 안내만 보인다", async () => {
  serve(NOTES, "");
  await openScreen(NOTES);

  await expect.element(page.getByText(text.empty)).toBeVisible();
  await expect.element(contents()).not.toBeInTheDocument();
});

test("5 MB를 넘는 파일은 그리지 않고 상한 안내와 원문 열기 링크를 보인다", async () => {
  serve(NOTES, "a".repeat(5 * 1024 * 1024 + 1));
  await openScreen(NOTES);

  await expect.element(page.getByText(text.tooLarge(5))).toBeVisible();
  await expect.element(contents()).not.toBeInTheDocument();
  await expectOpenRaw(NOTES);
});

test("허용 범위 밖이거나 없는 파일은 서버의 오류 문구를 화면 안의 알림으로 보이고 원문 열기 링크를 둔다", async () => {
  screenState.files[GUIDE] = () =>
    new Response("허용 범위 밖의 파일은 열 수 없습니다.", { status: 403 });
  await openScreen(GUIDE);

  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent(text.loadFailed("허용 범위 밖의 파일은 열 수 없습니다."));
  await expect.element(contents()).not.toBeInTheDocument();
  await expectOpenRaw(GUIDE);
});
