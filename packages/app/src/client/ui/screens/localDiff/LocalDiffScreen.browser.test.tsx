import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { saveDiffWrapPreference } from "@/client/infra/localFiles/diffWrapPreferenceStore";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { ViewerLayoutFixture } from "@/client/ui/shell/AppLayoutFixture.testkit";
import { LOCAL_FILES_PATH } from "@/shared/contract/localFiles";
import { LocalDiffScreen } from "./LocalDiffScreen";

const text = messages.localDiff;
const PATH = "/data/reports/inline-card-errors.patch";

// 주소의 path와 파일 API가 돌려줄 응답을 테스트마다 바꿉니다. 응답이 없는 경로는 404입니다.
const screenState = vi.hoisted(() => ({ path: "", files: {} as Record<string, () => Response> }));

vi.mock("next/navigation", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock({
    screenPath: "/diff",
    search: () => new URLSearchParams({ path: screenState.path }),
  }),
);

/** 여러 파일을 바꾸고 커밋 메시지와 서명이 붙은 git format-patch 파일입니다. */
const FORMAT_PATCH = [
  "From 3f9c2a1 Mon Sep 17 00:00:00 2001",
  "From: Kim <kim@example.com>",
  "Date: Tue, 3 Nov 2026 10:00:00 +0900",
  "Subject: [PATCH] Show inline card errors",
  "",
  "Card errors now appear under the field.",
  "---",
  " 3 files changed",
  "",
  ...fileDiff("src/checkout/payment/PaymentForm.tsx", [
    '-toast.error("Payment failed.");',
    '+setError("Payment failed.");',
  ]),
  ...fileDiff("src/checkout/payment/CardField.tsx", ["+export const label = 1;"]),
  ...fileDiff("README.md", ["+Card errors"]),
  "-- ",
  "2.47.0",
  "",
].join("\n");

function fileDiff(path: string, lines: string[]) {
  return [
    `diff --git a/${path} b/${path}`,
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -1,${lines.filter((line) => !line.startsWith("+")).length} +1,${lines.filter((line) => !line.startsWith("-")).length} @@`,
    ...lines,
  ];
}

beforeEach(() => {
  screenState.path = PATH;
  screenState.files = {};
  saveDiffWrapPreference(true);
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

function serve(contents: string, path = PATH) {
  screenState.files[path] = () => new Response(contents);
}

function openScreen() {
  return render(
    <LocaleProvider locale="ko">
      <ViewerLayoutFixture viewer="diff">
        <LocalDiffScreen />
      </ViewerLayoutFixture>
    </LocaleProvider>,
  );
}

const fileTree = () => page.getByRole("navigation", { name: text.files });
const changes = () => page.getByRole("region", { name: text.changes });

test("format-patch 파일의 변경 파일 트리는 하위 폴더 하나뿐인 폴더를 합치고 폴더를 먼저 이름순으로 보이며, 폴더를 접고 펼친다", async () => {
  serve(FORMAT_PATCH);
  await openScreen();

  const tree = fileTree();
  await expect.element(tree.getByRole("button", { name: "src/checkout/payment" })).toBeVisible();
  const rows = tree
    .getByRole("listitem")
    .elements()
    .map((item) => item.querySelector("button")!.textContent);
  expect(rows).toEqual(["src/checkout/payment", "CardField.tsx", "PaymentForm.tsx", "README.md"]);
  // 오른쪽에는 diff에 나온 순서대로 모든 파일을 그립니다.
  await expect
    .element(changes().getByRole("group", { name: "src/checkout/payment/PaymentForm.tsx" }))
    .toBeVisible();
  expect(changes().getByRole("group").elements()).toHaveLength(3);

  const folder = tree.getByRole("button", { name: "src/checkout/payment" });
  await userEvent.click(folder);
  await expect.element(folder).toHaveAttribute("aria-expanded", "false");
  await expect.element(tree.getByRole("button", { name: "CardField.tsx" })).not.toBeInTheDocument();
  await userEvent.click(folder);
  await expect.element(tree.getByRole("button", { name: "CardField.tsx" })).toBeVisible();
});

test("커밋 메시지 제목을 트리 위에 보이고, 누르면 나머지 본문과 서명을 펼친다", async () => {
  serve(FORMAT_PATCH);
  await openScreen();

  const title = fileTree().getByRole("button", { name: "Show inline card errors" });
  await expect.element(title).toHaveAttribute("aria-expanded", "false");
  const titleBox = title.element().getBoundingClientRect();
  const firstFolder = fileTree().getByRole("button", { name: "src/checkout/payment" });
  expect(titleBox.bottom).toBeLessThanOrEqual(firstFolder.element().getBoundingClientRect().top);
  await expect
    .element(fileTree().getByText("Card errors now appear under the field."))
    .not.toBeInTheDocument();

  await userEvent.click(title);
  await expect.element(title).toHaveAttribute("aria-expanded", "true");
  await expect
    .element(fileTree().getByText(/Card errors now appear under the field\./))
    .toBeVisible();
  await expect.element(fileTree().getByText(/2\.47\.0/)).toBeVisible();
  // 제목은 펼친 본문에 다시 보이지 않습니다.
  expect(
    fileTree()
      .element()
      .textContent.match(/Show inline card errors/g),
  ).toHaveLength(1);
});

test("커밋 메시지가 없는 diff에서는 커밋 메시지 영역을 그리지 않는다", async () => {
  serve(fileDiff("src/a.ts", ["-const a = 1;", "+const a = 2;"]).join("\n"));
  await openScreen();

  await expect.element(fileTree().getByRole("button", { name: "a.ts" })).toBeVisible();
  // 트리에는 폴더 하나와 파일 하나만 있습니다.
  expect(fileTree().getByRole("button").elements()).toHaveLength(2);
});

/**
 * 줄 내용 칸에서 글자가 그려진 줄의 순서(0부터)를 돌려줍니다. 글자 상자의 세로 중앙이 칸 위쪽에서 줄 높이 몇 개만큼 떨어졌는지로 줄을 셉니다.
 * 한글처럼 다른 글꼴로 그린 글자는 같은 줄에서도 글자 상자의 위쪽 좌표가 달라서, 위쪽 좌표로는 줄을 셀 수 없습니다.
 */
function lineIndexes(cell: Element, lineHeight: number) {
  const range = document.createRange();
  range.selectNodeContents(cell);
  const top = cell.getBoundingClientRect().top;
  const lines = [...range.getClientRects()].map((rect) =>
    Math.floor((rect.top + rect.height / 2 - top) / lineHeight),
  );
  return [...new Set(lines)].sort((a, b) => a - b);
}

test("긴 줄은 기본으로 줄바꿈하고 줄바꿈한 줄마다 부호 칸에 표식을 그리며, 해제하면 가로로 스크롤하고 다시 열어도 해제가 유지된다", async () => {
  const long = "결제에 실패했습니다. 카드 정보를 확인하고 다시 시도하세요. ".repeat(6);
  serve(
    fileDiff("src/a.ts", [
      `-const message = "${long}code=${"x".repeat(40)}";`,
      `+const message = "${long}code=${"y".repeat(40)}";`,
    ]).join("\n"),
  );
  const screen = await openScreen();

  const wrap = page.getByRole("button", { name: text.wrap });
  await expect.element(wrap).toHaveAttribute("aria-pressed", "true");
  await expect.element(changes().getByText("y".repeat(40))).toBeVisible();
  const scroller = changes().element().firstElementChild as HTMLElement;
  expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth);
  for (const kind of ["added", "deleted"]) {
    const row = scroller.querySelector(`tr.${kind}`)!;
    const cell = row.querySelector("td.text")!;
    const sign = row.querySelector("td.sign")!;
    // 바뀐 단어 강조(<mark>)와 한글이 섞여도 줄 높이가 같아야, 한 줄 높이 간격으로 반복하는 표식이 줄과 맞습니다.
    expect(cell.querySelector("mark")).not.toBeNull();
    const lineHeight = parseFloat(getComputedStyle(cell).lineHeight);
    const lines = lineIndexes(cell, lineHeight);
    expect(lines.length).toBeGreaterThan(2);
    // 줄마다 글자가 있고, 칸 높이가 줄 수만큼의 줄 높이와 같으면 모든 줄이 같은 높이로 쌓인 것입니다.
    expect(lines).toEqual([...lines.keys()]);
    expect(cell.getBoundingClientRect().height).toBeCloseTo(lines.length * lineHeight, 0);
    const marker = getComputedStyle(sign, "::after");
    expect(parseFloat(marker.top)).toBeCloseTo(lineHeight, 0);
    // 표식은 첫 줄 아래부터 한 줄 높이마다 하나씩 그려지므로, 줄바꿈으로 생긴 줄 수만큼 생깁니다.
    expect(parseFloat(marker.height) / lineHeight).toBeCloseTo(lines.length - 1, 1);
  }

  await userEvent.click(wrap);
  await expect.element(wrap).toHaveAttribute("aria-pressed", "false");
  expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
  const cell = scroller.querySelector("tr.added td.text")!;
  expect(lineIndexes(cell, parseFloat(getComputedStyle(cell).lineHeight))).toEqual([0]);
  expect(getComputedStyle(scroller.querySelector("tr.added td.sign")!, "::after").content).toBe(
    "none",
  );

  await screen.unmount();
  await openScreen();
  await expect
    .element(page.getByRole("button", { name: text.wrap }))
    .toHaveAttribute("aria-pressed", "false");
});

test("좁은 창에서는 변경 파일 트리를 처음에 숨기고 버튼으로 보이며, 넓은 창에서는 처음부터 보인다", async () => {
  serve(FORMAT_PATCH);
  await page.viewport(600, 800);
  try {
    const screen = await openScreen();
    const toggle = page.getByRole("button", { name: text.fileTree });
    await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
    await expect.element(fileTree()).not.toBeInTheDocument();
    await expect.element(changes().getByRole("group").first()).toBeVisible();
    // 트리가 숨겨진 동안 diff가 화면 폭을 모두 씁니다.
    const main = page.getByRole("main").element().getBoundingClientRect();
    expect(changes().element().getBoundingClientRect().width).toBe(main.width - 64);

    await userEvent.click(toggle);
    await expect.element(toggle).toHaveAttribute("aria-expanded", "true");
    await expect.element(fileTree().getByRole("button", { name: "README.md" })).toBeVisible();
    await screen.unmount();

    await page.viewport(1440, 900);
    await openScreen();
    await expect.element(fileTree().getByRole("button", { name: "README.md" })).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: text.fileTree }))
      .toHaveAttribute("aria-expanded", "true");
  } finally {
    await page.viewport(1440, 900);
  }
});

test("트리와 diff는 창 높이 안에서 각자 스크롤한다", async () => {
  const lines = Array.from({ length: 400 }, (_, index) => `+const line${index} = ${index};`);
  serve(fileDiff("src/long.ts", lines).join("\n"));
  await openScreen();

  await expect.element(changes().getByText("const line0 = 0;")).toBeVisible();
  const scroller = changes().element().firstElementChild as HTMLElement;
  expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);
  expect(changes().element().getBoundingClientRect().bottom).toBeLessThanOrEqual(
    window.innerHeight,
  );
  expect(document.documentElement.scrollHeight).toBe(document.documentElement.clientHeight);
});

test("1 MB보다 크고 5 MB 이하인 diff는 그리고, 5 MB를 넘는 diff는 상한 안내와 내려받기 버튼만 보인다", async () => {
  const line = `+${"a".repeat(1023)}`;
  const large = fileDiff(
    "big.txt",
    Array.from({ length: 1100 }, () => line),
  ).join("\n");
  expect(large.length).toBeGreaterThan(1024 * 1024);
  serve(large);
  const screen = await openScreen();
  await expect.element(changes().getByRole("group", { name: "big.txt" })).toBeVisible();
  await screen.unmount();

  serve(`${large}\n${"+b\n".repeat(1_500_000)}`);
  await openScreen();
  await expect.element(page.getByText(text.tooLarge(5))).toBeVisible();
  await expect.element(changes()).not.toBeInTheDocument();
  await expect
    .element(page.getByRole("link", { name: text.download }))
    .toHaveAttribute("download", "inline-card-errors.patch");
  await expect.element(page.getByRole("button", { name: text.wrap })).not.toBeInTheDocument();
});

test("내려받기 버튼은 파일 API 원문을 원래 파일 이름으로 내려받는다", async () => {
  serve(FORMAT_PATCH);
  await openScreen();

  const download = page.getByRole("link", { name: text.download });
  await expect.element(download).toHaveAttribute("download", "inline-card-errors.patch");
  const href = new URL(download.element().getAttribute("href")!, location.href);
  expect(href.pathname).toBe(LOCAL_FILES_PATH);
  expect(href.searchParams.get("path")).toBe(PATH);
  expect(href.searchParams.get("workspace")).toBe("demo");
});

test("허용 범위 밖이거나 없는 파일은 서버의 오류 문구를 화면 안의 알림으로 보인다", async () => {
  screenState.files[PATH] = () =>
    new Response("허용 범위 밖의 파일은 열 수 없습니다.", { status: 403 });
  await openScreen();

  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent(text.loadFailed("허용 범위 밖의 파일은 열 수 없습니다."));
  await expect.element(page.getByRole("link", { name: text.download })).not.toBeInTheDocument();
  await expect.element(changes()).not.toBeInTheDocument();
});

test("파일 diff로 나눌 수 없는 .diff는 트리 없이 줄 부호에 따라 색만 입힌 원문으로 보인다", async () => {
  serve("+ 추가한 메모\n- 지운 메모\n<script>alert(1)</script>\n");
  await openScreen();

  const contents = changes();
  await expect.element(contents.getByText("+ 추가한 메모")).toBeVisible();
  await expect
    .element(contents.getByText("<script>alert(1)</script>", { exact: false }))
    .toBeVisible();
  expect(contents.element().querySelector("script")).toBeNull();
  const added = contents.getByText("+ 추가한 메모").element();
  const removed = contents.getByText("- 지운 메모").element();
  expect(getComputedStyle(added).color).not.toBe(getComputedStyle(removed).color);
  await expect.element(fileTree()).not.toBeInTheDocument();
  await expect.element(page.getByRole("button", { name: text.wrap })).not.toBeInTheDocument();
});
