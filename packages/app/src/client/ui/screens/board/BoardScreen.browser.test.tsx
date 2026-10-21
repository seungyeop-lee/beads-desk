import { beforeEach, expect, test, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import type { GateTitles } from "@/client/modules/humanGates/domain/humanGateBlockers";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { AppLayoutFixture } from "@/client/ui/shell/AppLayoutFixture.testkit";
import type { BoardItem } from "@/shared/contract/board";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { BoardScreen } from "./BoardScreen";

// vitest.browser.config.ts의 browser.commands에 둔 명령입니다.
declare module "vitest/browser" {
  interface BrowserCommands {
    mouseDown: () => Promise<void>;
    mouseUp: () => Promise<void>;
  }
}

// 바로 작업 가능 열에 카드를 쌓아 화면 높이를 넘게 하고, 나머지 열은 비워 빈 열의 높이도 함께 잽니다.
const ITEMS: BoardItem[] = Array.from({ length: 14 }, (_, index) => ({
  column: "ready",
  issue: issue(`desk-${index}`, { title: `쌓인 작업 ${index}` }),
}));

/** 테스트마다 화면이 서버에서 읽을 보드 카드와 열린 gate를 정합니다. */
const reads = vi.hoisted(() => ({
  items: [] as BoardItem[],
  gateTitles: new Map() as GateTitles,
}));

// 화면이 서버에서 읽는 보드와 주소를 읽어 상세 dialog를 여는 부분은 고정 값으로 바꿉니다.
vi.mock("@/client/modules/board/application/useBoard", () => ({
  useBoard: () => ({ data: reads.items, error: null, loading: false }),
}));
vi.mock("@/client/modules/humanGates/application/useGateTitles", () => ({
  useGateTitles: () => reads.gateTitles,
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
  (await import("@/client/ui/address/screenAddressMocks.testkit")).issueDetailRouteMock("/board"),
);
vi.mock("next/navigation", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock({
    screenPath: "/board",
  }),
);

// 열린 gate를 정하지 않은 테스트는 gate 없이 그립니다.
beforeEach(() => {
  reads.gateTitles = new Map();
});

test("보드는 막힘, 바로 작업 가능, 진행 중, 닫힘 열만 이 순서로 보인다", async () => {
  reads.items = [];
  const screen = await render(
    <LocaleProvider locale="ko">
      <BoardScreen />
    </LocaleProvider>,
  );

  expect(
    screen
      .getByRole("region")
      .elements()
      .map((column) => column.getAttribute("aria-label")),
  ).toEqual(["막힘", "바로 작업 가능", "진행 중", "닫힘"]);
});

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

test("human gate가 막는 막힌 카드는 사람 확인 기다림과 gate 제목을 보인다", async () => {
  reads.items = [
    {
      column: "blocked",
      issue: issue("desk-work", { title: "검토받을 작업", blockedBy: ["desk-prior", "desk-gate"] }),
    },
  ];
  reads.gateTitles = new Map([["desk-gate", { title: "Review: desk-work", humanGate: true }]]);
  const screen = await render(
    <LocaleProvider locale="ko">
      <BoardScreen />
    </LocaleProvider>,
  );
  const blocked = screen.getByRole("region", { name: "막힘", exact: true });

  await expect.element(blocked).toMatchTextContent(messages.humanGate.waiting);
  await expect.element(blocked).toMatchTextContent("Review: desk-work");
});

test("카드의 ID 복사 단추에서 끌면 끌기가 시작되지 않고, 카드에서 끌면 시작되며, 카드를 누르는 동안 grabbing 커서를 보인다", async () => {
  reads.items = [{ column: "ready", issue: issue("desk-card", { title: "끌어 볼 작업" }) }];
  const screen = await render(
    <LocaleProvider locale="ko">
      <BoardScreen />
    </LocaleProvider>,
  );
  const card = screen.getByRole("link", { name: "desk-card 끌어 볼 작업" });
  const copyButton = screen.getByRole("button", { name: messages.copyId.labelOf("desk-card") });
  let dragStarts = 0;
  const countDragStart = () => dragStarts++;
  document.addEventListener("dragstart", countDragStart);
  try {
    // 같은 열 안에서 놓으므로 상태는 바꾸지 않습니다.
    await userEvent.hover(copyButton);
    await commands.mouseDown();
    await userEvent.hover(card);
    await commands.mouseUp();
    expect(dragStarts, "복사 단추에서 끈 횟수").toBe(0);

    await userEvent.hover(card);
    await commands.mouseDown();
    expect(getComputedStyle(card.element()).cursor).toBe("grabbing");
    await userEvent.hover(copyButton);
    await commands.mouseUp();
    await expect.poll(() => dragStarts).toBe(1);
  } finally {
    document.removeEventListener("dragstart", countDragStart);
  }
});
