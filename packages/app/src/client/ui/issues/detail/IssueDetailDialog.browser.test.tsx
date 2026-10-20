import type { IssueDetail } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { issueDetail } from "@/shared/domain/issues/issueFixture";
import { IssueDetailDialog } from "./IssueDetailDialog";

/** dialog가 서버에서 읽을 상세입니다. null이면 아직 받는 중입니다. */
const read = vi.hoisted(() => ({ detail: null as IssueDetail | null }));

vi.mock("@/client/modules/issues/application/useIssueDetail", () => ({
  useIssueDetail: () => ({ data: read.detail, error: null, loading: read.detail === null }),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ workspace: "demo" }),
  usePathname: () => "/w/demo/issues",
  useSearchParams: () => new URLSearchParams({ issue: "desk-1" }),
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}));

function Screen() {
  return (
    <LocaleProvider locale="ko">
      <a href="/issues">목록의 링크</a>
      <button type="button">목록의 단추</button>
      <IssueDetailDialog
        location={{ issue: "desk-1", side: null }}
        previous={null}
        detailHref={({ issue }) => `/issues?issue=${issue}`}
        onClose={() => {}}
      />
    </LocaleProvider>
  );
}

test("상세를 받는 동안에는 화면의 링크와 단추 위에서도 progress 커서를 보이고, 상세가 열리면 원래 커서로 돌아오며 제목에는 text 커서를 보인다", async () => {
  read.detail = null;
  const screen = await render(<Screen />);
  const cursor = (element: Element) => getComputedStyle(element).cursor;
  const link = screen.getByRole("link", { name: "목록의 링크" }).element();
  const button = screen.getByRole("button", { name: "목록의 단추" }).element();

  await expect.poll(() => cursor(link)).toBe("progress");
  expect(cursor(button)).toBe("progress");

  read.detail = issueDetail("desk-1", { title: "시작할 작업" });
  await screen.rerender(<Screen />);
  await expect
    .element(screen.getByRole("dialog", { name: messages.issueDetail.dialog("desk-1") }))
    .toBeVisible();
  expect(cursor(link)).toBe("pointer");
  expect(cursor(button)).toBe("pointer");
  expect(cursor(screen.getByRole("button", { name: "시작할 작업", exact: true }).element())).toBe(
    "text",
  );
});
