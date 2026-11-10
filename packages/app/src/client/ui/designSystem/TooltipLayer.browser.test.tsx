import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
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
