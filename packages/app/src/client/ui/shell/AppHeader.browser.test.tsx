import { expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { AppHeader } from "./AppHeader";

vi.mock("next/navigation", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock({
    screenPath: "/focus",
  }),
);
vi.mock("@/client/ui/issues/IssueDetailRoute", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).issueDetailRouteMock("/focus"),
);

function renderHeader() {
  return render(
    <LocaleProvider locale="ko">
      <AppHeader />
    </LocaleProvider>,
  );
}

test("화면 탭은 묶음 순서대로 놓이고 그래프 탭은 없으며, 묶음 사이의 구분선은 접근성 트리에 나오지 않는다", async () => {
  const screen = await renderHeader();

  await expect.element(screen.getByRole("navigation", { name: messages.shell.screens }))
    .toMatchAriaInlineSnapshot(`
    - navigation "화면":
      - /children: equal
      - link "지금":
        - /url: /w/demo/focus
      - link "판단 기다림":
        - /url: /w/demo/human
      - link "활동":
        - /url: /w/demo/activity
      - link "이슈":
        - /url: /w/demo/issues
      - link "에픽":
        - /url: /w/demo/epics
      - link "보드":
        - /url: /w/demo/board
      - link "결정":
        - /url: /w/demo/decisions
      - link "정리":
        - /url: /w/demo/hygiene
  `);
});

test("설정 단추를 누르면 설정 창이 열리고, Escape로 닫은 뒤 다시 누르면 다시 열린다", async () => {
  const screen = await renderHeader();
  const settings = screen.getByRole("dialog", { name: messages.settings.title });
  const open = screen.getByRole("button", { name: messages.settings.title, exact: true });

  await open.click();
  await expect.element(settings).toBeVisible();
  await userEvent.keyboard("{Escape}");
  await expect.element(settings).not.toBeInTheDocument();
  await open.click();
  await expect.element(settings).toBeVisible();
});
