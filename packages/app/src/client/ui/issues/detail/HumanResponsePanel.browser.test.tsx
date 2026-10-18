import { expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { ToastRegion } from "@/client/ui/designSystem/Toast";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { HumanResponsePanel } from "./HumanResponsePanel";

const ISSUE_ID = "desk-1";

/** Server Action을 실행하지 않고 쓰기가 성공한 것으로 돌려줍니다. */
const SUCCEEDING_WRITES: IssueWrites = {
  pending: false,
  error: null,
  dismissError: () => {},
  run: async <R,>() => ({ ok: true, data: null }) as R,
};

test("응답에 성공해도 다시 조회한 화면에서 패널이 빠지기 전에는 알리지 않고 버튼을 막아 두며, 패널이 빠지면 알린다", async () => {
  const screen = await render(<Panel shown />);
  await screen.getByRole("textbox", { name: messages.humanDecision.response }).click();
  await userEvent.keyboard("진행합니다");
  await screen.getByRole("button", { name: messages.humanDecision.respond }).click();

  await expect
    .element(screen.getByRole("button", { name: messages.humanDecision.respond }))
    .toBeDisabled();
  await expect
    .element(screen.getByRole("button", { name: messages.humanDecision.dismiss }))
    .toBeDisabled();
  await expect
    .element(screen.getByRole("status"))
    .not.toHaveTextContent(messages.humanDecision.responded(ISSUE_ID));

  await screen.rerender(<Panel shown={false} />);
  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent(messages.humanDecision.responded(ISSUE_ID));
});

test("응답 없이 닫는 데 성공해도 패널이 빠지기 전에는 알리지 않고 닫기 버튼을 막아 두며, 패널이 빠지면 알린다", async () => {
  const screen = await render(<Panel shown />);
  await screen.getByRole("button", { name: messages.humanDecision.dismiss }).click();
  await screen.getByRole("button", { name: messages.humanDecision.confirmDismiss }).click();

  await expect
    .element(screen.getByRole("button", { name: messages.humanDecision.confirmDismiss }))
    .toBeDisabled();
  await expect
    .element(screen.getByRole("status"))
    .not.toHaveTextContent(messages.humanDecision.dismissed(ISSUE_ID));

  await screen.rerender(<Panel shown={false} />);
  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent(messages.humanDecision.dismissed(ISSUE_ID));
});

/** 화면이 다시 조회해 이슈가 빠진 상황을 shown이 false인 것으로 나타냅니다. */
function Panel({ shown }: { shown: boolean }) {
  return (
    <LocaleProvider locale="ko">
      {shown && (
        <HumanResponsePanel
          issueId={ISSUE_ID}
          writes={SUCCEEDING_WRITES}
          title="판단을 기다립니다"
          body="응답하면 이슈가 닫힙니다."
          placeholder="응답"
        />
      )}
      <ToastRegion />
    </LocaleProvider>
  );
}
