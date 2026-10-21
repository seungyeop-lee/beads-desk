import type { Issue } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { IssueTextHits } from "@/client/modules/issues/domain/issueListView";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { AppLayoutFixture } from "@/client/ui/shell/AppLayoutFixture.testkit";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { IssuesScreen } from "./IssuesScreen";

const ISSUES = Array.from({ length: 40 }, (_, index) =>
  issue(`desk-${index}`, { title: `쌓인 작업 ${index}` }),
);

/** 테스트마다 화면이 서버에서 읽을 목록, 본문·댓글 검색 결과, 주소의 query를 정합니다. */
const reads = vi.hoisted(() => ({
  issues: [] as Issue[],
  textMatches: new Map<string, IssueTextHits>(),
  query: "",
}));

// 화면이 서버에서 읽는 목록·검색·쓰기와 주소를 읽어 상세 dialog를 여는 부분은 고정 값으로 바꿉니다.
vi.mock("@/client/modules/issues/application/useIssueList", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/client/modules/issues/application/useIssueList")>()),
  useIssueList: () => ({ data: reads.issues, error: null, loading: false }),
}));
vi.mock("@/client/modules/issues/application/useIssueTextMatches", () => ({
  useIssueTextMatches: (search: string) => ({
    matches: reads.textMatches.get(search.trim()),
    term: search.trim(),
    error: null,
  }),
}));
vi.mock("@/client/modules/humanGates/application/useGateTitles", () => ({
  useGateTitles: () => new Map(),
}));
vi.mock("@/client/modules/issues/application/useIssueWrites", () => ({
  useIssueWrites: () => ({
    pending: false,
    error: null,
    dismissError: () => {},
    run: async (write: () => unknown) => write(),
  }),
}));
vi.mock("@/client/ui/issues/IssueDetailRoute", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).issueDetailRouteMock("/issues"),
);
vi.mock("next/navigation", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock({
    screenPath: "/issues",
    search: () => new URLSearchParams(reads.query),
  }),
);

test("페이지 끝까지 스크롤해도 상단 머리글이 화면 위에 붙어 있다", async () => {
  reads.issues = ISSUES;
  reads.query = "";
  await page.viewport(800, 600);
  const screen = await render(
    <LocaleProvider locale="ko">
      <AppLayoutFixture>
        <IssuesScreen />
      </AppLayoutFixture>
    </LocaleProvider>,
  );
  await expect.element(screen.getByText("쌓인 작업 39")).toBeInTheDocument();

  window.scrollTo({ top: document.documentElement.scrollHeight });
  expect(window.scrollY, "한 화면 높이보다 많이 스크롤함").toBeGreaterThan(600);
  expect(screen.getByRole("banner").element().getBoundingClientRect().top).toBe(0);
});

test("본문·댓글 검색어를 넣으면 고른 보기 탭의 개수가 맞은 이슈의 수로 줄어든다", async () => {
  reads.issues = [
    issue("desk-login", { title: "로그인 오류", ready: true }),
    issue("desk-layout", { title: "화면 정리", ready: true }),
    issue("desk-notice", { title: "알림 설정", ready: true }),
  ];
  reads.textMatches = new Map([
    [
      "토큰",
      new Map([["desk-login", [{ field: "description", excerpt: "세션 토큰이 만료되면" }]]]),
    ],
  ]);
  reads.query = "view=ready";
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssuesScreen />
    </LocaleProvider>,
  );
  const tabs = screen.getByRole("navigation", { name: messages.issues.views });
  const readyTab = (count: number) =>
    tabs.getByRole("link", { name: `${messages.workStates.labels.ready} ${count}`, exact: true });
  const search = screen.getByRole("searchbox", { name: messages.issues.search });

  await expect.element(readyTab(3)).toHaveAttribute("aria-current", "page");
  await search.fill("토큰");
  await expect.element(readyTab(1)).toHaveAttribute("aria-current", "page");
  await expect
    .element(screen.getByRole("link", { name: "로그인 오류", exact: true }))
    .toBeVisible();
});
