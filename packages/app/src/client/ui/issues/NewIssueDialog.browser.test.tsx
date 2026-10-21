import { expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { NewIssueDialog } from "./NewIssueDialog";

vi.mock("@/client/modules/issues/application/useIssueList", () => ({
  useIssueCandidates: () => ({
    data: [issue("desk-epic", { title: "상위로 고를 에픽", issueType: "epic" })],
    error: null,
    loading: false,
  }),
}));

async function renderDialog() {
  const onClose = vi.fn<() => void>();
  const screen = await render(
    <LocaleProvider locale="ko">
      <NewIssueDialog onCreated={() => {}} onClose={onClose} />
    </LocaleProvider>,
  );
  const dialog = screen.getByRole("dialog", { name: messages.newIssue.title });
  return { dialog, onClose };
}

test("새 이슈 창을 열면 제목 칸에 초점이 있고, 설명 편집기에서 Escape를 눌러도 편집기에 초점이 남고 창이 닫히지 않는다", async () => {
  const { dialog, onClose } = await renderDialog();
  const editor = dialog.getByRole("textbox", { name: messages.issue.bodyFields.description });

  await expect.element(dialog.getByRole("textbox", { name: messages.issue.title })).toHaveFocus();
  await editor.click();
  await userEvent.keyboard("{Escape}");

  await expect.element(editor).toHaveFocus();
  await expect.element(dialog).toBeVisible();
  expect(onClose).not.toHaveBeenCalled();
});

test("상위 이슈 후보 목록에서 Escape를 누르면 목록만 닫히고 ArrowDown으로 다시 열리며, 고른 상위 이슈는 지우기 단추로 지워 다시 찾을 수 있다", async () => {
  const { dialog, onClose } = await renderDialog();
  const search = dialog.getByRole("combobox", { name: messages.newIssue.parentSearch });
  const candidates = dialog.getByRole("listbox", { name: messages.newIssue.parentSearch });
  const epic = candidates.getByRole("option", { name: /desk-epic/ });

  await search.fill("상위로");
  await expect.element(epic).toBeVisible();
  await userEvent.keyboard("{Escape}");
  await expect.element(candidates).not.toBeInTheDocument();
  await expect.element(dialog).toBeVisible();
  expect(onClose).not.toHaveBeenCalled();

  await userEvent.keyboard("{ArrowDown}");
  await expect.element(epic).toBeVisible();
  await epic.click();
  const clear = dialog.getByRole("button", { name: messages.newIssue.clearParent });
  await expect.element(dialog.getByText("상위로 고를 에픽")).toBeVisible();
  await clear.click();

  await expect.element(clear).not.toBeInTheDocument();
  await expect.element(search).toHaveValue("");
});
