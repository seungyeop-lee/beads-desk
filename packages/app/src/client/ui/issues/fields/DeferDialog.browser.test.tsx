import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { askDeferral, DeferDialogHost } from "./DeferDialog";

test("보류 기한을 물으면 머리글의 ID 복사 단추보다 기한 칸에 먼저 초점이 가고, 기한은 내일로 골라져 있다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <DeferDialogHost />
    </LocaleProvider>,
  );
  const until = screen
    .getByRole("dialog", { name: messages.deferral.title })
    .getByRole("combobox", { name: messages.deferral.until });

  void askDeferral("desk-1");

  await expect.element(until).toHaveFocus();
  await expect.element(until).toHaveValue("tomorrow");
});
