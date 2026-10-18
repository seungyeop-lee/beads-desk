import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
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
