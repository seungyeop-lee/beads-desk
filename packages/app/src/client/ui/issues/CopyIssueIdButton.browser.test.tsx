import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { ToastRegion } from "@/client/ui/designSystem/Toast";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { CopyIssueIdButton } from "./CopyIssueIdButton";

test("ID 복사 단추는 copy 커서를 보이고, 짧게 보일 때도 전체 ID를 이름으로 알려 준다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <CopyIssueIdButton issueId="bd-desk-2lj.1" short />
      <CopyIssueIdButton issueId="bd-desk-9xk" />
    </LocaleProvider>,
  );

  for (const [id, text] of [
    ["bd-desk-2lj.1", "2lj.1"],
    ["bd-desk-9xk", "bd-desk-9xk"],
  ]) {
    const button = screen.getByRole("button", { name: messages.copyId.labelOf(id), exact: true });
    await expect.element(button).toHaveAttribute("title", messages.copyId.label);
    expect(button.element().textContent).toBe(text);
    expect(getComputedStyle(button.element()).cursor).toBe("copy");
  }
});

test("짧게 보이는 ID 복사 단추를 누르면 전체 ID를 클립보드에 넣고, 누를 때마다 복사 알림을 하나씩 더 띄운다", async () => {
  // 알림 문구는 누른 뒤에 실행되는 코드가 layout의 `<html lang>`을 읽어 고릅니다.
  document.documentElement.lang = "ko";
  const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  const screen = await render(
    <LocaleProvider locale="ko">
      <CopyIssueIdButton issueId="bd-desk-2lj.1" short />
      <ToastRegion />
    </LocaleProvider>,
  );
  const button = screen.getByRole("button", { name: messages.copyId.labelOf("bd-desk-2lj.1") });
  const toasts = screen.getByText(messages.copyId.copied("bd-desk-2lj.1"), { exact: true });

  await button.click();
  await expect.poll(() => toasts.elements()).toHaveLength(1);
  await button.click();
  await expect.poll(() => toasts.elements()).toHaveLength(2);
  expect(writeText.mock.calls).toEqual([["bd-desk-2lj.1"], ["bd-desk-2lj.1"]]);
});
