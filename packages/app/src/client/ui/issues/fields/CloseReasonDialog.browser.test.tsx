import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { askCloseReason, CloseReasonDialogHost } from "./CloseReasonDialog";

test("닫는 사유를 물으면 머리글의 ID 복사 단추보다 사유 칸에 먼저 초점이 가고, 입력한 사유로 닫으면 그 사유를 돌려주고 창이 닫힌다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <CloseReasonDialogHost />
    </LocaleProvider>,
  );
  const dialog = screen.getByRole("dialog", { name: messages.closeIssue.title });
  const reason = dialog.getByRole("textbox", { name: messages.closeIssue.reason });

  const answer = askCloseReason("desk-1");
  await expect.element(reason).toHaveFocus();
  await reason.fill("확인함");
  await dialog.getByRole("button", { name: messages.closeIssue.submit }).click();

  expect(await answer).toBe("확인함");
  await expect.element(dialog).not.toBeInTheDocument();
});
