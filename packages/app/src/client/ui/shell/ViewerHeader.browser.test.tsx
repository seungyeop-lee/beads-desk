import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { ViewerHeader } from "./ViewerHeader";

vi.mock("next/navigation", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock({
    screenPath: "/diff",
  }),
);

test("viewer 머리글에는 링크가 아닌 로고, viewer 이름, workspace 이름만 있고 화면 탭과 버튼은 없다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <ViewerHeader viewer="diff" />
    </LocaleProvider>,
  );

  await expect.element(screen.getByRole("banner")).toMatchAriaInlineSnapshot(`
    - banner:
      - /children: equal
      - text: beads-desk diff 뷰어 demo
  `);
});
