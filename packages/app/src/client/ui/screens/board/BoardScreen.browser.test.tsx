import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { AppLayoutFixture } from "@/client/ui/shell/AppLayoutFixture";
import type { BoardItem } from "@/shared/contract/board";
import { issue } from "@/shared/domain/issues/issueFixture";
import { BoardScreen } from "./BoardScreen";

// 바로 작업 가능 열에 카드를 쌓아 화면 높이를 넘게 하고, 나머지 열은 비워 빈 열의 높이도 함께 잽니다.
const ITEMS: BoardItem[] = Array.from({ length: 14 }, (_, index) => ({
  column: "ready",
  issue: issue(`desk-${index}`, { title: `쌓인 작업 ${index}` }),
}));

/** 테스트마다 화면이 서버에서 읽을 보드 카드를 정합니다. */
const reads = vi.hoisted(() => ({ items: [] as BoardItem[] }));

// 화면이 서버에서 읽는 보드와 주소를 읽어 상세 dialog를 여는 부분은 고정 값으로 바꿉니다.
vi.mock("@/client/modules/board/application/useBoard", () => ({
  useBoard: () => ({ data: reads.items, error: null, loading: false }),
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
  useIssueHref: () => (id: string) => `/board?issue=${id}`,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ workspace: "demo" }),
  usePathname: () => "/w/demo/board",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}));

test("넓은 창에서 열이 화면 높이를 채우고 카드 목록만 열 안에서 스크롤된다", async () => {
  reads.items = ITEMS;
  await page.viewport(1280, 720);
  const screen = await render(
    <LocaleProvider locale="ko">
      <AppLayoutFixture>
        <BoardScreen />
      </AppLayoutFixture>
    </LocaleProvider>,
  );

  const ready = screen.getByRole("region", { name: "바로 작업 가능", exact: true }).element();
  const blocked = screen.getByRole("region", { name: "막힘", exact: true }).element();
  const list = ready.querySelector("ul")!;
  const heading = ready.querySelector("h2")!;

  expect(list.scrollHeight, "카드 목록의 세로 넘침").toBeGreaterThan(list.clientHeight);
  expect(
    document.documentElement.scrollHeight <= document.documentElement.clientHeight,
    "페이지 세로 넘침",
  ).toBe(true);
  expect(
    Math.abs(blocked.getBoundingClientRect().height - ready.getBoundingClientRect().height),
    "빈 열과 카드 많은 열의 높이 차",
  ).toBeLessThanOrEqual(1);
  const bottomGap = document.documentElement.clientHeight - ready.getBoundingClientRect().bottom;
  expect(bottomGap, "열 아래 끝에서 뷰포트 아래까지 거리").toBeGreaterThanOrEqual(0);
  expect(bottomGap, "열 아래 끝에서 뷰포트 아래까지 거리").toBeLessThan(40);

  const headingTop = heading.getBoundingClientRect().top;
  list.scrollTop = list.scrollHeight;
  expect(heading.getBoundingClientRect().top, "목록을 스크롤한 뒤 열 머리줄 위치").toBe(headingTop);
});

test("좁은 창에서는 열이 세로로 쌓이고 빈 열이 카드 한 장 높이 수준으로 작게 남는다", async () => {
  reads.items = ITEMS;
  await page.viewport(455, 900);
  const screen = await render(
    <LocaleProvider locale="ko">
      <BoardScreen />
    </LocaleProvider>,
  );

  const blocked = screen.getByRole("region", { name: "막힘", exact: true }).element();
  const height = blocked.querySelector("ul")!.getBoundingClientRect().height;
  expect(height, "빈 열 카드 목록의 높이").toBeGreaterThanOrEqual(75);
  expect(height, "빈 열 카드 목록의 높이").toBeLessThan(120);
  expect(
    document.documentElement.scrollHeight > document.documentElement.clientHeight,
    "긴 목록은 페이지가 스크롤됨",
  ).toBe(true);
});

test("카드는 짧은 ID를 복사 단추로 보이고, 카드를 덮는 링크는 grab 커서를 보이며, 막힌 카드는 기다리는 선행 이슈를 보인다", async () => {
  reads.items = [
    { column: "ready", issue: issue("desk-first", { title: "선행 작업", dependentCount: 1 }) },
    {
      column: "blocked",
      issue: issue("desk-second", { title: "기다리는 작업", blockedBy: ["desk-first"] }),
    },
  ];
  const screen = await render(
    <LocaleProvider locale="ko">
      <BoardScreen />
    </LocaleProvider>,
  );

  for (const id of ["desk-first", "desk-second"]) {
    const copyButton = screen.getByRole("button", { name: messages.copyId.labelOf(id) });
    expect(copyButton.element().textContent).toBe(shortIssueId(id));
  }
  const card = screen.getByRole("link", { name: "desk-first 선행 작업" });
  expect(getComputedStyle(card.element()).cursor).toBe("grab");
  await expect
    .element(screen.getByRole("region", { name: "막힘", exact: true }))
    .toMatchTextContent(messages.blocking.waitingOn("desk-first"));
});
