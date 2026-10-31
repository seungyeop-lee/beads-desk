import type { Issue } from "@beads-desk/bd/issue";
import { describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { BOTTLENECK_ORDER, focusBottlenecks } from "@/client/modules/focus/domain/focusBottlenecks";
import { focusDeadlines } from "@/client/modules/focus/domain/focusDeadlines";
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
vi.mock("@/client/modules/gates/application/useGateTitles", () => ({
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

describe("병목 탭", () => {
  // 기반 작업은 후속 셋을 막아 대기 수가 가장 많고, 버그 수정과 가장 급한 작업은 대기 수가 같아 바로 풀리는 수로 갈립니다.
  // 우선순위 순서(가장 급한 작업, 버그 수정, 기반 작업)와 반대로 놓여야 병목 순서를 따른 것입니다.
  const BOTTLENECK_ISSUES = [
    issue("desk-c", { title: "가장 급한 작업", priority: 1, ready: true, labels: ["ui"] }),
    issue("desk-a", { title: "버그 수정", issueType: "bug", priority: 2, ready: true }),
    issue("desk-b", { title: "기반 작업", priority: 3, ready: true }),
    issue("desk-a-after", { title: "버그 후속", blockedBy: ["desk-a"] }),
    issue("desk-b-after-1", { title: "기반 후속 1", blockedBy: ["desk-b"] }),
    issue("desk-b-after-2", { title: "기반 후속 2", blockedBy: ["desk-b"] }),
    issue("desk-joined", { title: "합류 후속", blockedBy: ["desk-b", "desk-c"] }),
  ];

  async function renderIssues(query: string) {
    reads.issues = BOTTLENECK_ISSUES;
    reads.textMatches = new Map();
    reads.query = query;
    const screen = await render(
      <LocaleProvider locale="ko">
        <IssuesScreen />
      </LocaleProvider>,
    );
    const tabs = screen.getByRole("navigation", { name: messages.issues.views });
    return {
      screen,
      bottleneckTab: tabs.getByRole("link", {
        name: new RegExp(`^${messages.focus.bottlenecks.title} \\d+$`),
      }),
      /** 표의 행마다 제목과 맨 뒤 칸의 글자입니다. */
      rows: () =>
        [...screen.container.querySelectorAll("tbody tr")].map((row) => [
          row.querySelector("td:nth-child(3) a")!.textContent,
          row.querySelector("td:last-child")!.textContent,
        ]),
    };
  }

  test("주소의 view=bottleneck은 병목 탭을 고른 상태로 열고, 표 위에 정렬 설명을, 표에 지금 화면과 같은 순서와 닫으면 바로 풀리는 수를 보인다", async () => {
    const { screen, bottleneckTab, rows } = await renderIssues("view=bottleneck");
    const now = Date.now();
    const focusOrder = focusBottlenecks(
      BOTTLENECK_ISSUES,
      focusDeadlines(BOTTLENECK_ISSUES, now),
      now,
    ).map(({ issue, unblocks }) => [issue.title, String(unblocks)]);

    await expect.element(bottleneckTab).toHaveAttribute("aria-current", "page");
    await expect
      .element(bottleneckTab)
      .toHaveAccessibleName(`${messages.focus.bottlenecks.title} 3`);
    await expect
      .element(screen.getByText(messages.focus.bottlenecks.order(BOTTLENECK_ORDER)))
      .toBeVisible();
    await expect
      .element(screen.getByText(messages.issueTable.unblocks, { exact: true }))
      .toBeInTheDocument();
    expect(rows()).toEqual([
      ["기반 작업", "2"],
      ["버그 수정", "1"],
      ["가장 급한 작업", "0"],
    ]);
    expect(rows()).toEqual(focusOrder);
  });

  for (const { condition, query, search, titles } of [
    {
      condition: "유형",
      query: "view=bottleneck&type=task",
      search: "",
      titles: ["기반 작업", "가장 급한 작업"],
    },
    {
      condition: "라벨",
      query: "view=bottleneck&label=ui",
      search: "",
      titles: ["가장 급한 작업"],
    },
    { condition: "검색어", query: "view=bottleneck", search: "기반", titles: ["기반 작업"] },
  ]) {
    test(`병목 탭에서 ${condition} 조건으로 좁히면 표에 맞는 후보만 순서대로 남고, 탭의 개수가 표의 행 수와 같다`, async () => {
      const { screen, bottleneckTab, rows } = await renderIssues(query);
      if (search) {
        await screen.getByRole("searchbox", { name: messages.issues.search }).fill(search);
      }

      await expect
        .element(bottleneckTab)
        .toHaveAccessibleName(`${messages.focus.bottlenecks.title} ${titles.length}`);
      await expect.element(bottleneckTab).toHaveAttribute("aria-current", "page");
      expect(rows().map(([title]) => title)).toEqual(titles);
    });
  }

  test("작업 상태 탭의 표에는 닫으면 바로 풀리는 수 열과 정렬 설명이 없다", async () => {
    const { screen } = await renderIssues("view=ready");

    await expect
      .element(screen.getByRole("link", { name: "가장 급한 작업", exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByText(messages.issueTable.unblocks, { exact: true }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText(messages.focus.bottlenecks.order(BOTTLENECK_ORDER)))
      .not.toBeInTheDocument();
  });
});
