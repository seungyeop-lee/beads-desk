import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { HelpTooltip } from "./HelpTooltip";
import { TooltipLayer } from "./TooltipLayer";

const LONG_DESCRIPTION =
  "목록 조건과 스크롤 위치를 유지한 채 이슈의 전체 설명을 읽고 원래 하던 작업으로 돌아갑니다. ".repeat(
    4,
  );

const DESCRIPTIONS = [
  "짧은 설명",
  "Short explanation",
  "短い説明",
  LONG_DESCRIPTION,
  "Read the complete explanation without losing your current filters, scroll position, or keyboard focus. ".repeat(
    4,
  ),
  "一覧の条件とスクロール位置を維持したまま説明の全文を読み、元の作業に戻ることができます。".repeat(
    4,
  ),
  "unbroken".repeat(40),
];

for (const width of [400, 1280])
  for (const theme of ["desk", "desk-dark"])
    test(`${theme} 테마 ${width}px 창의 가장자리에서 짧거나 긴 세 언어 설명과 긴 낱말을 끝까지 읽는다`, async () => {
      await page.viewport(width, 800);
      document.documentElement.dataset.theme = theme;
      try {
        const screen = await render(
          <>
            <button
              style={{ position: "fixed", right: 8, bottom: 8 }}
              data-tooltip={DESCRIPTIONS[0]}
            >
              안내 대상
            </button>
            <TooltipLayer />
          </>,
        );
        const target = screen.getByRole("button", { name: "안내 대상" });
        for (const text of DESCRIPTIONS) {
          target.element().setAttribute("data-tooltip", text);
          await userEvent.hover(target);
          const tooltip = page.getByRole("tooltip");
          await expect.element(tooltip).toHaveTextContent(text.trim());
          const element = tooltip.element();
          const box = element.getBoundingClientRect();
          const targetBox = target.element().getBoundingClientRect();
          expect(box.left).toBeGreaterThanOrEqual(8);
          expect(box.right).toBeLessThanOrEqual(width - 8);
          expect(box.top).toBeGreaterThanOrEqual(8);
          expect(box.bottom).toBeLessThanOrEqual(targetBox.top - 4);
          const content = document.createRange();
          content.selectNodeContents(element);
          const textBox = content.getBoundingClientRect();
          expect(textBox.left).toBeGreaterThanOrEqual(box.left);
          expect(textBox.right).toBeLessThanOrEqual(box.right);
          expect(textBox.top).toBeGreaterThanOrEqual(box.top);
          expect(textBox.bottom).toBeLessThanOrEqual(box.bottom);
          const marker = getComputedStyle(element, "::after");
          const markerWidth = parseFloat(marker.width);
          const markerHeight = parseFloat(marker.height);
          const markerRadius = Math.hypot(markerWidth, markerHeight) / 2;
          const markerX = box.left + parseFloat(marker.left);
          const markerY =
            marker.top === "auto"
              ? box.bottom - parseFloat(marker.bottom) - markerHeight / 2
              : box.top + parseFloat(marker.top) + markerHeight / 2;
          expect(markerWidth).toBeGreaterThan(0);
          expect(markerX - markerRadius).toBeGreaterThanOrEqual(0);
          expect(markerX + markerRadius).toBeLessThanOrEqual(width);
          expect(markerY - markerRadius).toBeGreaterThanOrEqual(0);
          expect(markerY + markerRadius).toBeLessThanOrEqual(targetBox.top);
          expect(markerX).toBeGreaterThanOrEqual(targetBox.left);
          expect(markerX).toBeLessThanOrEqual(targetBox.right);
          expect(target.element().getAttribute("aria-describedby")).toBe(element.id);
          expect(target.element().hasAttribute("title")).toBe(false);
          await userEvent.unhover(target);
          await expect.element(tooltip).not.toBeInTheDocument();
        }
      } finally {
        delete document.documentElement.dataset.theme;
      }
    });

test("기존 접근 가능한 설명을 보존하고 키보드 진입·Escape·클릭·재진입을 지원한다", async () => {
  let clicks = 0;
  const screen = await render(
    <>
      <span id="existing-description">원래 설명</span>
      <button
        data-tooltip="추가 안내"
        aria-describedby="existing-description"
        onClick={() => clicks++}
      >
        실행
      </button>
      <TooltipLayer />
    </>,
  );
  const target = screen.getByRole("button", { name: "실행" });
  await userEvent.tab();
  await expect.element(target).toHaveFocus();
  await expect.element(page.getByRole("tooltip")).toHaveTextContent("추가 안내");
  await expect
    .poll(() => target.element().getAttribute("aria-describedby"))
    .toContain("existing-description ");
  await userEvent.keyboard("{Escape}");
  await expect.element(page.getByRole("tooltip")).not.toBeInTheDocument();
  expect(target.element().getAttribute("aria-describedby")).toBe("existing-description");
  await userEvent.hover(target);
  await expect.element(page.getByRole("tooltip")).toBeVisible();
  await target.click();
  expect(clicks).toBe(1);
  await expect.element(page.getByRole("tooltip")).not.toBeInTheDocument();
  await userEvent.unhover(target);
  await userEvent.hover(target);
  await expect.element(page.getByRole("tooltip")).toBeVisible();
  window.dispatchEvent(new Event("resize"));
  await expect.element(page.getByRole("tooltip")).not.toBeInTheDocument();
});

test("dialog의 설명도 top layer에서 잘리지 않고 대상의 클릭을 가로채지 않는다", async () => {
  const screen = await render(
    <>
      <dialog
        ref={(dialog) => dialog?.showModal()}
        aria-label="좁은 대화상자"
        style={{ width: 140, overflow: "hidden" }}
      >
        <button data-tooltip={LONG_DESCRIPTION}>대화상자 대상</button>
      </dialog>
      <TooltipLayer />
    </>,
  );
  await userEvent.hover(screen.getByRole("button", { name: "대화상자 대상" }));
  await expect.element(page.getByRole("tooltip")).toBeVisible();
  const tooltip = page.getByRole("tooltip").element();
  const dialog = screen.getByRole("dialog").element().getBoundingClientRect();
  expect(tooltip.getBoundingClientRect().width).toBeGreaterThan(dialog.width);
});

test("도움말 크기와 시작·끝 정렬을 유지하며 같은 안내 영역에서 마우스와 키보드를 지원한다", async () => {
  await page.viewport(1280, 800);
  const screen = await render(
    <>
      <div style={{ position: "fixed", left: 80, top: 80 }}>
        <HelpTooltip help="작은 도움말" />
      </div>
      <div style={{ position: "fixed", right: 80, top: 160 }}>
        <HelpTooltip help="머리글 끝 도움말" placement="header-end" />
      </div>
      <TooltipLayer />
    </>,
  );
  const below = screen.getByRole("button", { name: "작은 도움말" });
  const headerEnd = screen.getByRole("button", { name: "머리글 끝 도움말" });
  const belowBox = below.element().getBoundingClientRect();
  const endBox = headerEnd.element().getBoundingClientRect();
  expect(belowBox.width).toBeLessThan(endBox.width);
  expect(belowBox.height).toBeLessThan(endBox.height);

  await userEvent.hover(below);
  const tooltip = page.getByRole("tooltip");
  await expect.element(tooltip).toHaveTextContent("작은 도움말");
  expect(tooltip.element().getBoundingClientRect().left).toBeCloseTo(belowBox.left, 0);
  await userEvent.unhover(below);
  await expect.element(tooltip).not.toBeInTheDocument();
  await userEvent.tab();
  await expect.element(below).toHaveFocus();
  await expect.element(tooltip).toHaveTextContent("작은 도움말");
  await userEvent.tab();
  await expect.element(headerEnd).toHaveFocus();
  await expect.element(tooltip).toHaveTextContent("머리글 끝 도움말");
  expect(page.getByRole("tooltip").elements()).toHaveLength(1);
  expect(tooltip.element().getBoundingClientRect().right).toBeCloseTo(endBox.right, 0);
  await userEvent.keyboard("{Escape}");
  await expect.element(tooltip).not.toBeInTheDocument();
});

test("스크롤바 공간을 뺀 좁은 창에서도 긴 도움말이 양쪽 여백 안에 들어간다", async () => {
  await page.viewport(400, 800);
  const root = document.documentElement;
  const originalGutter = root.style.scrollbarGutter;
  const originalOverflow = root.style.overflowY;
  root.style.scrollbarGutter = "stable";
  root.style.overflowY = "scroll";
  try {
    const screen = await render(
      <>
        <button style={{ position: "fixed", right: 8, top: 8 }} data-tooltip={LONG_DESCRIPTION}>
          스크롤바 옆 안내
        </button>
        <TooltipLayer />
      </>,
    );
    expect(root.clientWidth).toBeLessThan(window.innerWidth);
    await userEvent.hover(screen.getByRole("button", { name: "스크롤바 옆 안내" }));
    const tooltip = page.getByRole("tooltip");
    await expect.element(tooltip).toBeVisible();
    const box = tooltip.element().getBoundingClientRect();
    expect(box.left).toBeGreaterThanOrEqual(8);
    expect(box.right).toBeLessThanOrEqual(root.clientWidth - 8);
    expect(root.scrollWidth).toBe(root.clientWidth);
    expect(tooltip.element().scrollHeight).toBeLessThanOrEqual(tooltip.element().clientHeight);
  } finally {
    root.style.scrollbarGutter = originalGutter;
    root.style.overflowY = originalOverflow;
  }
});
