import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { AppLayoutFixture } from "@/client/ui/shell/AppLayoutFixture.testkit";
import { ScreenFrame } from "./ScreenFrame";

vi.mock("next/navigation", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock({
    screenPath: "/issues",
  }),
);

for (const width of [455, 2000]) {
  for (const variant of ["default", "spacious", "board"] as const) {
    test(`폭 ${width}px에서 ${variant} 화면의 바깥 틀과 머리글이 같은 폭으로 정렬된다`, async () => {
      await page.viewport(width, 900);
      const screen = await render(
        <LocaleProvider locale="ko">
          <AppLayoutFixture>
            <ScreenFrame variant={variant}>
              <h1>화면 제목</h1>
              <p>화면 본문</p>
            </ScreenFrame>
          </AppLayoutFixture>
        </LocaleProvider>,
      );
      const main = screen.getByRole("main").element();
      const mainBox = main.getBoundingClientRect();
      const headingBox = screen
        .getByRole("heading", { name: "화면 제목" })
        .element()
        .getBoundingClientRect();
      const bannerBox = screen.getByRole("banner").element().getBoundingClientRect();
      expect(mainBox.width).toBe(Math.min(width, 1536));
      expect(mainBox.left).toBe((width - mainBox.width) / 2);
      expect(headingBox.left).toBe(mainBox.left + 32);
      expect(headingBox.right).toBe(mainBox.right - 32);
      expect(mainBox.top).toBeGreaterThanOrEqual(bannerBox.bottom);
      expect(main.scrollWidth).toBeLessThanOrEqual(main.clientWidth);
      expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth);
      expect(getComputedStyle(main).gap).toBe(variant === "spacious" ? "24px" : "16px");
      expect(getComputedStyle(main).paddingBottom).toBe(
        variant === "board" && width >= 768 ? "24px" : "64px",
      );
      const navBox = screen
        .getByRole("navigation", { name: "화면" })
        .element()
        .getBoundingClientRect();
      expect(navBox.left).toBeGreaterThanOrEqual(mainBox.left + (width < 640 ? 16 : 32));
      expect(navBox.right).toBeLessThanOrEqual(mainBox.right - (width < 640 ? 16 : 32));
    });
  }
}
