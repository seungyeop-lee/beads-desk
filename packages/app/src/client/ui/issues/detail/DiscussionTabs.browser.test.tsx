import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { issueDetail } from "@/shared/domain/issues/issueFixture.testkit";
import { DiscussionTabs } from "./DiscussionTabs";

// 활동 탭이 서버에서 읽는 bd 기록은 고정 값으로 바꿉니다.
vi.mock("@/client/modules/issues/application/useIssueHistory", () => ({
  useIssueHistory: () => ({ data: [], error: null, loading: false }),
}));

test("처음에는 댓글 탭이 골라져 있고, 활동 탭을 누르면 활동 탭만 골라져 그 탭의 내용을 보인다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <DiscussionTabs
        issue={issueDetail("desk-1")}
        disabled={false}
        onAddComment={async () => true}
      />
    </LocaleProvider>,
  );
  const comments = screen.getByRole("tab", { name: messages.comments.title, exact: true });
  const activity = screen.getByRole("tab", { name: messages.activity.title, exact: true });

  await expect.element(comments).toHaveAttribute("aria-selected", "true");
  await expect.element(activity).toHaveAttribute("aria-selected", "false");

  await activity.click();
  await expect.element(activity).toHaveAttribute("aria-selected", "true");
  await expect.element(comments).toHaveAttribute("aria-selected", "false");
  await expect
    .element(screen.getByRole("tabpanel", { name: messages.activity.title, exact: true }))
    .toBeInTheDocument();
});
