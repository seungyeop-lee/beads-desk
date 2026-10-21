import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { escapeStepHandlers } from "@/client/ui/designSystem/modal";
import { issueDetail } from "@/shared/domain/issues/issueFixture.testkit";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { IssueSidePanel } from "./IssueSidePanel";

vi.mock("@/client/modules/issues/application/useIssueDetail", () => ({
  useIssueDetail: (id: string) => ({
    data: issueDetail(id, {
      title: "선행 이슈",
      description: "```mermaid\nflowchart LR\n  C[선행 그림] --> D[후속]\n```",
      comments: [{ id: "c1", author: "리뷰어", text: "**먼저 남긴 댓글**", createdAt: 0 }],
    }),
    error: null,
    loading: false,
  }),
}));

function SidePanel() {
  return (
    <IssueSidePanel
      issueId="desk-2"
      closeHref="/issues?issue=desk-1"
      openHref="/issues?issue=desk-2"
      sideHref={(id) => `/issues?issue=desk-1&side=${id}`}
    />
  );
}

test("옆 패널은 머리글에 ID 복사 단추를 두고, 그 이슈의 댓글을 작성자, markdown 본문과 함께 읽기 전용으로 보인다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <SidePanel />
    </LocaleProvider>,
  );
  const side = screen.getByRole("region", { name: messages.issueDetail.sidePanel("desk-2") });
  const comments = side.getByRole("article");

  await expect
    .element(side.getByRole("button", { name: messages.copyId.labelOf("desk-2"), exact: true }))
    .toBeVisible();

  await expect.element(side.getByRole("heading", { name: messages.comments.title })).toBeVisible();
  expect(comments.elements()).toHaveLength(1);
  await expect.element(comments.getByText("리뷰어", { exact: true })).toBeVisible();
  await expect.element(comments.getByRole("strong")).toHaveTextContent("먼저 남긴 댓글");
  expect(side.element().querySelectorAll("input, textarea, select")).toHaveLength(0);
  expect(side.getByRole("button", { name: messages.comments.submit }).elements()).toHaveLength(0);
});

test("상세 dialog 안의 옆 패널에서 그림을 크게 본 뒤 Esc로 닫으면 크게 본 그림만 닫히고 옆 패널은 남는다", async () => {
  const closeSide = vi.fn<() => boolean>(() => true);
  // 상세 dialog처럼 Escape 한 번에 옆 패널을 닫는 처리기를 둡니다.
  const screen = await render(
    <LocaleProvider locale="ko">
      <dialog {...escapeStepHandlers(closeSide)}>
        <SidePanel />
      </dialog>
    </LocaleProvider>,
  );
  const detail = screen.container.querySelector("dialog")!;
  detail.showModal();
  const side = screen.getByRole("region", { name: messages.issueDetail.sidePanel("desk-2") });
  const enlarged = page.getByRole("dialog", { name: messages.markdownEditor.enlargedDiagram });

  await side.getByRole("button", { name: messages.markdownEditor.enlargeDiagram }).click();
  await expect.element(enlarged).toBeVisible();
  expect(enlarged.element().querySelector("svg.pele")?.textContent).toContain("선행 그림");
  await userEvent.keyboard("{Escape}");

  await expect.element(enlarged).not.toBeInTheDocument();
  expect(closeSide).not.toHaveBeenCalled();
  expect(detail.open).toBe(true);
  await expect.element(side).toBeVisible();
});
