import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { AppLayoutFixture } from "@/client/ui/shell/AppLayoutFixture";
import { issue } from "@/shared/domain/issues/issueFixture";
import { IssuesScreen } from "./IssuesScreen";

const ISSUES = Array.from({ length: 40 }, (_, index) =>
  issue(`desk-${index}`, { title: `쌓인 작업 ${index}` }),
);

// 화면이 서버에서 읽는 목록·검색·쓰기와 주소를 읽어 상세 dialog를 여는 부분은 고정 값으로 바꿉니다.
vi.mock("@/client/modules/issues/application/useIssueList", () => ({
  useIssueList: () => ({ data: ISSUES, error: null, loading: false }),
}));
vi.mock("@/client/modules/issues/application/useIssueTextMatches", () => ({
  useIssueTextMatches: () => ({ matches: undefined, term: "", error: null }),
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
vi.mock("@/client/ui/issues/IssueDetailRoute", () => ({
  IssueDetailRoute: () => null,
  useIssueHref: () => (id: string) => `/issues?issue=${id}`,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ workspace: "demo" }),
  usePathname: () => "/w/demo/issues",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}));

test("페이지 끝까지 스크롤해도 상단 머리글이 화면 위에 붙어 있다", async () => {
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
  expect(screen.getByTestId("app-header").element().getBoundingClientRect().top).toBe(0);
});
