import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { CommentList } from "./CommentList";
import { milkdownDom } from "@/client/ui/designSystem/milkdownDom.testkit";
import { peleDom } from "@/client/ui/designSystem/peleDom.testkit";

test("댓글 본문의 mermaid 그림을 그리고, 그 그림을 눌러 크게 볼 수 있다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <CommentList
        comments={[
          {
            id: "c1",
            author: "리뷰어",
            text: "```mermaid\nflowchart LR\n  E[댓글 그림] -->|답함| F[답]\n```",
            createdAt: 0,
          },
        ]}
        disabled={false}
        onAdd={async () => true}
      />
    </LocaleProvider>,
  );
  const comment = screen.getByRole("article");

  await expect
    .poll(() => comment.element().querySelector(milkdownDom.previewDiagram)?.textContent)
    .toContain("답함");
  await comment.getByRole("button", { name: messages.markdownEditor.enlargeDiagram }).click();
  const enlarged = page.getByRole("dialog", { name: messages.markdownEditor.enlargedDiagram });
  await expect.element(enlarged).toBeVisible();
  expect(enlarged.element().querySelector(peleDom.diagram)?.textContent).toContain("댓글 그림");
});
