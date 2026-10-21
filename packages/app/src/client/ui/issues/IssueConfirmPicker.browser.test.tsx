import type { Issue } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { IssueConfirmPicker } from "./IssueConfirmPicker";

vi.mock("@/client/modules/issues/application/useIssueList", () => ({
  useIssueCandidates: () => ({
    data: [issue("desk-task", { title: "넣을 후보 작업" })],
    error: null,
    loading: false,
  }),
}));

const LABEL = messages.epics.addExistingChild;
const CONFIRM = messages.epics.addChildConfirm;

test("후보를 고르기만 하면 확인을 요청하지 않고, 선택 취소를 누르면 검색 칸으로 돌아간다", async () => {
  const onConfirm = vi.fn<(issue: Issue) => Promise<boolean>>(async () => true);
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssueConfirmPicker label={LABEL} confirmLabel={CONFIRM} onConfirm={onConfirm} />
    </LocaleProvider>,
  );
  const search = screen.getByRole("combobox", { name: LABEL });

  await search.fill("넣을 후보");
  await screen
    .getByRole("listbox", { name: LABEL })
    .getByRole("option", { name: /desk-task/ })
    .click();
  await expect.element(screen.getByRole("button", { name: CONFIRM })).toBeVisible();
  expect(onConfirm).not.toHaveBeenCalled();

  await screen.getByRole("button", { name: messages.issuePicker.clearSelection }).click();
  await expect.element(search).toBeVisible();
  await expect.element(screen.getByRole("button", { name: CONFIRM })).not.toBeInTheDocument();
  expect(onConfirm).not.toHaveBeenCalled();
});
