import { expect, onTestFinished, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { THEME_COOKIE } from "@/shared/contract/theme";
import { ThemePicker } from "./ThemePicker";
import { ThemeProvider } from "./ThemeProvider";

const refresh = vi.hoisted(() => vi.fn<() => void>());

vi.mock("next/navigation", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock({
    router: { refresh },
  }),
);

test("지금 테마를 선택된 값으로 보이고, 테마를 고르면 서버가 읽을 쿠키에 남긴 뒤 화면을 다시 그리게 한다", async () => {
  onTestFinished(() => {
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0`;
  });
  const screen = await render(
    <LocaleProvider locale="ko">
      <ThemeProvider theme="light">
        <ThemePicker />
      </ThemeProvider>
    </LocaleProvider>,
  );
  const select = screen.getByRole("combobox", { name: messages.settings.theme });
  await expect.element(select).toHaveValue("light");

  await select.selectOptions(messages.settings.themes.dark);

  expect(document.cookie).toContain(`${THEME_COOKIE}=dark`);
  expect(refresh).toHaveBeenCalledOnce();
});
