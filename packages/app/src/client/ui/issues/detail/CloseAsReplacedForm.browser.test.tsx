import { afterEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { ToastRegion } from "@/client/ui/designSystem/Toast";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { closeAsReplacedAction } from "@/server/web/issues/issueActions";
import { issue, issueDetail } from "@/shared/domain/issues/issueFixture.testkit";
import { CloseAsReplacedForm } from "./CloseAsReplacedForm";

vi.mock("@/client/modules/issues/application/useIssueList", () => ({
  useIssueCandidates: () => ({
    data: [issue("desk-2", { title: "대상 작업" })],
    error: null,
    loading: false,
  }),
}));
vi.mock("@/server/web/issues/issueActions", () => ({
  closeAsReplacedAction: vi.fn<typeof closeAsReplacedAction>(async () => ({
    ok: true,
    data: null,
  })),
}));

/** Server Action 대신 mock을 부르고, 그 결과를 그대로 돌려줍니다. */
const WRITES: IssueWrites = {
  pending: false,
  error: null,
  dismissError: () => {},
  run: (write) => write("demo"),
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(closeAsReplacedAction).mockClear();
});

async function renderForm() {
  const screen = await render(
    <LocaleProvider locale="ko">
      <CloseAsReplacedForm issue={issueDetail("desk-1")} writes={WRITES} />
      <ToastRegion />
    </LocaleProvider>,
  );
  const search = screen.getByRole("combobox", { name: messages.closeAsReplaced.search });
  // 확인 창에서 거절하면 검색어가 남으므로, 비우고 다시 입력해 후보 목록을 엽니다.
  const pick = async () => {
    await search.clear();
    await search.fill("대상");
    await screen
      .getByRole("listbox", { name: messages.closeAsReplaced.search })
      .getByRole("option", { name: /desk-2/ })
      .click();
  };
  return { screen, pick };
}

test("다른 이슈로 대체해 닫으면 대체할 이슈를 넣은 문구로 확인을 받은 뒤 닫기를 요청하고, 닫았다고 알린다", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  const { screen, pick } = await renderForm();

  await pick();

  expect(confirm).toHaveBeenCalledWith(
    messages.closeAsReplaced.confirm.supersede("desk-1", "desk-2"),
  );
  await expect
    .poll(() => vi.mocked(closeAsReplacedAction).mock.calls)
    .toEqual([["demo", "desk-1", "supersede", "desk-2"]]);
  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent(messages.closeAsReplaced.closed.supersede("desk-1", "desk-2"));
});

test("중복으로 닫을 때 확인 창에서 거절하면 닫기를 요청하지 않고, 수락하면 원본을 넣은 문구로 닫았다고 알린다", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
  const { screen, pick } = await renderForm();
  await screen
    .getByRole("combobox", { name: messages.closeAsReplaced.method })
    .selectOptions(messages.closeAsReplaced.methods.duplicate);

  await pick();

  expect(confirm).toHaveBeenCalledWith(
    messages.closeAsReplaced.confirm.duplicate("desk-1", "desk-2"),
  );
  expect(vi.mocked(closeAsReplacedAction)).not.toHaveBeenCalled();
  await expect
    .element(screen.getByRole("status"))
    .not.toHaveTextContent(messages.closeAsReplaced.closed.duplicate("desk-1", "desk-2"));

  await pick();

  await expect
    .poll(() => vi.mocked(closeAsReplacedAction).mock.calls)
    .toEqual([["demo", "desk-1", "duplicate", "desk-2"]]);
  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent(messages.closeAsReplaced.closed.duplicate("desk-1", "desk-2"));
});
