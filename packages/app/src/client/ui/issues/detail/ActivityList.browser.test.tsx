import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { ActivityList } from "./ActivityList";

vi.mock("@/client/modules/issues/application/useIssueHistory", () => ({
  useIssueHistory: () => ({ data: [], error: null, loading: false }),
}));

test("활동 목록에 섞인 댓글의 mermaid 그림을 코드 대신 그림으로 그린다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <ActivityList
        issue={{
          id: "desk-1",
          comments: [
            {
              id: "c1",
              author: "리뷰어",
              text: "```mermaid\nflowchart LR\n  E[활동 그림] -->|처리| F[답]\n```",
              createdAt: 0,
            },
          ],
        }}
      />
    </LocaleProvider>,
  );

  await expect
    .poll(() => screen.container.querySelector(".preview svg")?.textContent)
    .toContain("활동 그림");
  expect(screen.container.querySelector<HTMLElement>(".cm-content")!.checkVisibility()).toBe(false);
});
