import { expect, onTestFinished, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { enMessages as messages } from "@/client/modules/locale/domain/enMessages";
import { LOCALE_COOKIE } from "@/shared/contract/locale";
import { LocalePicker } from "./LocalePicker";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";

const refresh = vi.hoisted(() => vi.fn<() => void>());

vi.mock("next/navigation", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock({
    router: { refresh },
  }),
);

test("지금 언어를 선택된 값으로 보이고, 언어를 고르면 서버가 읽을 쿠키에 남긴 뒤 화면을 다시 그리게 한다", async () => {
  onTestFinished(() => {
    document.cookie = `${LOCALE_COOKIE}=; path=/; max-age=0`;
  });
  const screen = await render(
    <LocaleProvider locale="en">
      <LocalePicker />
    </LocaleProvider>,
  );
  const select = screen.getByRole("combobox", { name: messages.settings.language });
  await expect.element(select).toHaveValue("en");

  await select.selectOptions("한국어");

  expect(document.cookie).toContain(`${LOCALE_COOKIE}=ko`);
  expect(refresh).toHaveBeenCalledOnce();
});
