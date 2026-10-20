import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { issueDetail } from "@/shared/domain/issues/issueFixture";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { IssueSidePanel } from "./IssueSidePanel";

vi.mock("@/client/modules/issues/application/useIssueDetail", () => ({
  useIssueDetail: (id: string) => ({
    data: issueDetail(id, {
      title: "선행 이슈",
      comments: [{ id: "c1", author: "리뷰어", text: "**먼저 남긴 댓글**", createdAt: 0 }],
    }),
    error: null,
    loading: false,
  }),
}));

test("옆 패널은 그 이슈의 댓글을 작성자, markdown 본문과 함께 읽기 전용으로 보인다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssueSidePanel
        issueId="desk-2"
        closeHref="/issues?issue=desk-1"
        openHref="/issues?issue=desk-2"
        sideHref={(id) => `/issues?issue=desk-1&side=${id}`}
      />
    </LocaleProvider>,
  );
  const side = screen.getByRole("region", { name: messages.issueDetail.sidePanel("desk-2") });
  const comments = side.getByRole("article");

  await expect.element(side.getByRole("heading", { name: messages.comments.title })).toBeVisible();
  expect(comments.elements()).toHaveLength(1);
  await expect.element(comments.getByText("리뷰어", { exact: true })).toBeVisible();
  await expect.element(comments.getByRole("strong")).toHaveTextContent("먼저 남긴 댓글");
  expect(side.element().querySelectorAll("input, textarea, select")).toHaveLength(0);
  expect(side.getByRole("button", { name: messages.comments.submit }).elements()).toHaveLength(0);
});
