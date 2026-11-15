import { afterEach, expect, test } from "vitest";
import { render } from "vitest-browser-react";

const JA_HEADING = "記録を残す・設定の変更・図の確認";
const CODE_SAMPLE = "bd ready";

const initialLang = document.documentElement.lang;

afterEach(() => {
  document.documentElement.lang = initialLang;
});

test("html[lang=ja]에서는 --font-sans가 한국어 글꼴 대신 일본어 글꼴을 우선하고 고정폭 글꼴은 유지한다", async () => {
  document.documentElement.lang = "ja";

  const screen = await render(
    <div className="font-sans">
      <h1 className="text-2xl font-bold">{JA_HEADING}</h1>
      <code className="font-mono">{CODE_SAMPLE}</code>
    </div>,
  );

  const headingFont = getComputedStyle(screen.getByRole("heading").element()).fontFamily;
  expect(headingFont).toContain("Hiragino Sans");
  expect(headingFont).not.toContain("Pretendard");
  expect(headingFont).not.toContain("Apple SD Gothic Neo");
  expect(headingFont).not.toContain("Noto Sans KR");

  const codeFont = getComputedStyle(screen.getByText(CODE_SAMPLE).element()).fontFamily;
  expect(codeFont).toContain("JetBrains Mono");
  expect(codeFont).toContain("monospace");
});

test("html[lang=ko]에서는 기존 한국어 우선 --font-sans 글꼴 스택을 유지한다", async () => {
  document.documentElement.lang = "ko";

  const screen = await render(
    <div className="font-sans">
      <h1 className="text-2xl font-bold">{JA_HEADING}</h1>
    </div>,
  );

  const headingFont = getComputedStyle(screen.getByRole("heading").element()).fontFamily;
  expect(headingFont).toContain("Pretendard Variable");
  expect(headingFont).toContain("Apple SD Gothic Neo");
});
