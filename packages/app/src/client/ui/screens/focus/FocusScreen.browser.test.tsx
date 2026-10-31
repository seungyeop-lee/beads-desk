import type { Issue } from "@beads-desk/bd/issue";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { BOTTLENECK_ORDER } from "@/client/modules/focus/domain/focusBottlenecks";
import type { GateTitles } from "@/client/modules/gates/domain/humanGateBlockers";
import { enMessages } from "@/client/modules/locale/domain/enMessages";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import {
  expectEpicProgressSegments,
  IN_PROGRESS_COUNT_TEXT,
} from "@/client/ui/issues/EpicProgress.testkit";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import type { EpicSummary } from "@/shared/contract/epics";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { FocusScreen } from "./FocusScreen";

const ISSUES: Issue[] = [
  issue("desk-plain-1", { title: "평범한 작업 하나", ready: true, createdAt: 1 }),
  issue("desk-plain-2", { title: "평범한 작업 둘", ready: true, createdAt: 2 }),
  issue("desk-plain-3", { title: "평범한 작업 셋", ready: true, createdAt: 3 }),
  // 가장 늦게 만든 이슈라, 대기 수로 정렬하지 않으면 다음에 할 일의 맨 아래에 옵니다.
  issue("desk-bottleneck", { title: "병목 작업", ready: true, createdAt: 4 }),
  issue("desk-middle", { title: "중간 작업", blockedBy: ["desk-bottleneck"] }),
  issue("desk-last", { title: "마지막 작업", blockedBy: ["desk-middle"] }),
  issue("desk-doing", { title: "진행하는 작업", status: "in_progress" }),
  issue("desk-after-doing", { title: "진행 뒤 작업", blockedBy: ["desk-doing"] }),
];

/** 테스트마다 화면이 서버에서 읽을 이슈 목록, 에픽 진행률, 열린 gate를 정합니다. 에픽 진행률이 null이면 아직 읽는 중입니다. */
const reads = vi.hoisted(() => ({
  issues: [] as Issue[],
  epics: [] as EpicSummary[] | null,
  gateTitles: new Map() as GateTitles,
}));

// 화면이 서버에서 읽는 목록과 주소, 상세 dialog를 여는 부분은 고정 값으로 바꿉니다.
vi.mock("@/client/modules/issues/application/useIssueList", () => ({
  useIssueList: () => ({ data: reads.issues, error: null, loading: false }),
}));
vi.mock("@/client/modules/epics/application/useEpics", () => ({
  useEpics: () => ({ data: reads.epics, error: null, loading: reads.epics === null }),
}));
vi.mock("@/client/modules/humanDecisions/application/useHumanDecisionCount", () => ({
  useHumanDecisionCount: () => ({ data: 0, error: null, loading: false }),
}));
vi.mock("@/client/modules/gates/application/useGateTitles", () => ({
  useGateTitles: () => reads.gateTitles,
}));
vi.mock("@/client/ui/issues/IssueDetailRoute", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).issueDetailRouteMock("/focus"),
);
vi.mock("next/navigation", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock({
    screenPath: "/focus",
  }),
);

// 열린 gate를 정하지 않은 테스트는 gate 없이 그립니다.
beforeEach(() => {
  reads.gateTitles = new Map();
});

const WAITERS = /\d+개 대기/;

function renderFocus(locale: "ko" | "en" = "ko") {
  return render(
    <LocaleProvider locale={locale}>
      <FocusScreen />
    </LocaleProvider>,
  );
}

test("다음에 할 일은 같은 우선순위에서 대기 수가 많은 이슈부터 보이고, 진행 중·다음에 할 일·막힘의 행은 기다리는 이슈가 있을 때만 대기 수를 보인다", async () => {
  reads.issues = ISSUES;
  reads.epics = [];
  const screen = await renderFocus();
  const region = (name: string) => screen.getByRole("region", { name, exact: true });
  const inProgress = region(messages.focus.inProgress);
  const nextUp = region(messages.focus.nextUp);
  const blocked = region(messages.workStates.labels.blocked);
  // 병목 영역에도 같은 이슈의 행이 있으므로, 행을 찾을 영역을 정해 찾습니다.
  const rowText = (scope: typeof nextUp, id: string, title: string) =>
    scope
      .getByRole("link", { name: `${id} ${title}`, exact: true })
      .element()
      .closest("li")!.textContent;
  const nextUpRows = nextUp.getByRole("listitem");

  await expect.element(nextUpRows).toHaveLength(4);
  expect(nextUpRows.first().element()).toBe(
    nextUp.getByRole("link", { name: "desk-bottleneck 병목 작업" }).element().closest("li"),
  );
  expect(rowText(nextUp, "desk-bottleneck", "병목 작업")).toContain(messages.issue.waiters(2));
  for (const [id, title] of [
    ["desk-plain-1", "평범한 작업 하나"],
    ["desk-plain-2", "평범한 작업 둘"],
    ["desk-plain-3", "평범한 작업 셋"],
  ])
    expect(rowText(nextUp, id!, title!)).not.toMatch(WAITERS);
  expect(rowText(inProgress, "desk-doing", "진행하는 작업")).toContain(messages.issue.waiters(1));
  expect(rowText(blocked, "desk-middle", "중간 작업")).toContain(messages.issue.waiters(1));
  expect(rowText(blocked, "desk-last", "마지막 작업")).not.toMatch(WAITERS);
});

test("다음에 할 일은 5개까지만 보이고, 바로 작업 가능한 이슈가 그보다 많을 때만 이슈 목록의 바로 작업 가능 보기로 가는 모두 보기를 보인다", async () => {
  const readyIssues = (count: number) =>
    Array.from({ length: count }, (_, index) =>
      issue(`desk-ready-${index}`, { title: `바로 할 작업 ${index}`, ready: true }),
    );
  reads.epics = [];
  reads.issues = readyIssues(6);
  const screen = await renderFocus();
  const nextUp = screen.getByRole("region", { name: messages.focus.nextUp, exact: true });
  const seeAll = nextUp.getByRole("link", {
    name: `${messages.focus.list.seeAll(6)} →`,
    exact: true,
  });

  await expect.element(nextUp.getByRole("listitem")).toHaveLength(5);
  await expect.element(seeAll).toHaveAttribute("href", "/w/demo/issues?view=ready");

  reads.issues = readyIssues(5);
  await screen.rerender(
    <LocaleProvider locale="ko">
      <FocusScreen />
    </LocaleProvider>,
  );
  await expect.element(nextUp.getByRole("listitem")).toHaveLength(5);
  await expect.element(nextUp.getByRole("link", { name: /모두 보기/ })).not.toBeInTheDocument();
});

test("에픽 진행률을 다 읽기 전에도 지금 화면을 그리고, 에픽 진행률 영역은 다 읽은 뒤에 보인다", async () => {
  reads.issues = ISSUES;
  reads.epics = null;
  const screen = await renderFocus();
  const epicProgress = screen.getByRole("region", {
    name: messages.focus.epicProgress,
    exact: true,
  });

  await expect
    .element(screen.getByRole("region", { name: messages.focus.nextUp, exact: true }))
    .toBeVisible();
  await expect.element(epicProgress).not.toBeInTheDocument();

  reads.epics = [];
  await screen.rerender(
    <LocaleProvider locale="ko">
      <FocusScreen />
    </LocaleProvider>,
  );
  await expect.element(epicProgress).toBeVisible();
});

test("에픽 진행률 영역은 하위 이슈 4개 중 1개가 닫히고 1개가 진행 중인 에픽의 막대에 닫힌 구간 뒤로 진행 중 구간을 그리고, 진행 중 수는 글자로 보이지 않는다", async () => {
  reads.issues = [];
  reads.epics = [
    {
      epic: issue("desk-a", { title: "움직이는 에픽", issueType: "epic" }),
      totalChildren: 4,
      closedChildren: 1,
      inProgressChildren: 1,
    },
    {
      epic: issue("desk-b", { title: "멈춘 에픽", issueType: "epic" }),
      totalChildren: 4,
      closedChildren: 1,
      inProgressChildren: 0,
    },
  ];
  const screen = await renderFocus();
  const region = screen.getByRole("region", { name: messages.focus.epicProgress, exact: true });

  const moving = region.getByRole("link", { name: /움직이는 에픽/ });
  const bar = moving.getByRole("progressbar", {
    name: messages.focus.epicProgressOf("움직이는 에픽"),
  });
  await expect.element(bar).toHaveAttribute("aria-valuenow", "1");
  expectEpicProgressSegments(bar.element(), { closed: 1, inProgress: 1, total: 4 });
  await expect.element(moving.getByText("1/4", { exact: true })).toBeVisible();
  await expect.element(region.getByText(IN_PROGRESS_COUNT_TEXT)).not.toBeInTheDocument();

  const idle = region.getByRole("link", { name: /멈춘 에픽/ });
  expectEpicProgressSegments(
    idle.getByRole("progressbar", { name: messages.focus.epicProgressOf("멈춘 에픽") }).element(),
    { closed: 1, inProgress: 0, total: 4 },
  );
});

test("human gate가 막는 막힘 행은 사람 확인 기다림과 gate 제목을 보인다", async () => {
  reads.issues = [
    issue("desk-prior", { title: "선행 작업", ready: true }),
    issue("desk-work", { title: "검토받을 작업", blockedBy: ["desk-prior", "desk-gate"] }),
  ];
  reads.epics = [];
  reads.gateTitles = new Map([["desk-gate", { title: "Review: desk-work", humanGate: true }]]);
  const screen = await renderFocus();
  const blocked = screen
    .getByRole("region", { name: messages.workStates.labels.blocked, exact: true })
    .getByRole("listitem");

  await expect.element(blocked).toMatchTextContent(messages.humanGate.waiting);
  await expect.element(blocked).toMatchTextContent("Review: desk-work");
});

describe("마감", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // 오늘 밤 마감, 내일 마감, 이미 지난 마감 이슈와 마감일 없는 이슈입니다. 시각은 browser 현지 시각입니다.
  const DUE_ISSUES = [
    issue("desk-tonight", {
      title: "오늘 밤 마감",
      dueAt: new Date(2026, 9, 30, 23, 30).getTime(),
    }),
    issue("desk-tomorrow", { title: "내일 마감", dueAt: new Date(2026, 9, 31, 12, 0).getTime() }),
    issue("desk-past", {
      title: "지난 마감",
      status: "in_progress",
      dueAt: new Date(2026, 9, 29).getTime(),
    }),
    issue("desk-undated", { title: "마감일 없음", ready: true }),
  ];

  test("마감 묶음마다 날짜 기준을 보이고, 이슈가 그대로여도 마감 시각과 자정을 넘으면 다시 나눈다", async () => {
    // 1분마다 바뀌는 흐름 통계의 시계(setInterval)는 그대로 두고, 마감 분류가 쓰는 시계만 바꿉니다.
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date(2026, 9, 30, 23, 0));
    reads.issues = DUE_ISSUES;
    reads.epics = [];
    const screen = await renderFocus();
    const deadlines = screen.getByRole("region", {
      name: messages.focus.deadlines.title,
      exact: true,
    });
    const group = (name: string) => deadlines.getByRole("region", { name, exact: true });
    const overdue = group(messages.focus.deadlines.overdue);
    const today = group(messages.focus.deadlines.dueToday);
    const soon = group(messages.focus.deadlines.dueSoon(3));

    await expect
      .element(overdue.getByRole("heading"))
      .toHaveTextContent("기한 초과마감 시각이 지남1");
    await expect.element(overdue).toMatchTextContent("지난 마감");
    await expect.element(today.getByRole("heading")).toHaveTextContent("오늘 마감10월 30일 (금)1");
    await expect.element(today).toMatchTextContent("오늘 밤 마감");
    await expect
      .element(soon.getByRole("heading"))
      .toMatchTextContent(/^3일 이내10월 31일 \(토\).+11월 2일 \(월\)1$/);
    await expect.element(soon).toMatchTextContent("내일 마감");
    await expect.element(deadlines).not.toMatchTextContent("마감일 없음");

    await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 1);
    await expect.element(overdue).toMatchTextContent("오늘 밤 마감");
    await expect.element(today).not.toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    await expect.element(today.getByRole("heading")).toHaveTextContent("오늘 마감10월 31일 (토)1");
    await expect.element(today).toMatchTextContent("내일 마감");
    await expect.element(soon).not.toBeInTheDocument();
  });

  test("영어 화면은 bd의 용어로 묶음 이름을 보이고 날짜 기준을 영어 날짜로 보인다", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 30, 23, 0));
    reads.issues = DUE_ISSUES;
    reads.epics = [];
    const screen = await renderFocus("en");
    const text = enMessages.focus.deadlines;
    const deadlines = screen.getByRole("region", { name: text.title, exact: true });
    const heading = (name: string) =>
      deadlines.getByRole("region", { name, exact: true }).getByRole("heading");

    await expect.element(heading(text.overdue)).toHaveTextContent("OverduePast the due time1");
    await expect.element(heading(text.dueToday)).toHaveTextContent("Due todayFri, October 301");
    await expect
      .element(heading(text.dueSoon(3)))
      .toMatchTextContent(/^Next 3 daysSat, October 31.+Mon, November 21$/);
  });
});

describe("병목", () => {
  // 그래프로 가는 링크에도 화살표가 있으므로, 마감 묶음 이름까지 맞춰 마감 근거 줄을 찾습니다.
  const DUE_EVIDENCE = /→ (기한 초과|오늘 마감|3일 이내) ·/;

  afterEach(() => {
    vi.useRealTimers();
  });

  // 기준 작업은 마감이 걸린 후속 작업 둘을 막고, 그중 하나는 다른 선행 작업도 기다립니다.
  // 넷째 날 작업만 막는 이슈는 처음에는 마감 근거가 없다가, 자정이 지나면 3일 이내 마감에 들어 앞으로 옵니다.
  const BOTTLENECK_ISSUES = [
    issue("desk-base", { title: "기준 작업", ready: true, priority: 3 }),
    issue("desk-other", { title: "다른 선행 작업", status: "in_progress", priority: 3 }),
    issue("desk-tonight", {
      title: "오늘 밤 후속",
      blockedBy: ["desk-base"],
      dueAt: new Date(2026, 9, 30, 23, 30).getTime(),
    }),
    issue("desk-joined", {
      title: "합류 후속",
      blockedBy: ["desk-base", "desk-other"],
      dueAt: new Date(2026, 9, 31, 9, 0).getTime(),
    }),
    issue("desk-undated-prior", { title: "마감 없는 선행", ready: true, priority: 0 }),
    issue("desk-undated-after", { title: "마감 없는 후속", blockedBy: ["desk-undated-prior"] }),
    issue("desk-fourth-prior", { title: "넷째 날 선행", ready: true, priority: 1 }),
    issue("desk-fourth-after", {
      title: "넷째 날 후속",
      blockedBy: ["desk-fourth-prior"],
      dueAt: new Date(2026, 10, 3, 10, 0).getTime(),
    }),
  ];

  test("후보마다 지금 상태와 닫는다고 가정한 계산을 나눠 보이고, 마감 목록과 같은 분류로 마감 근거를 붙이며, 자정이 지나면 근거와 순서를 다시 정한다", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date(2026, 9, 30, 23, 0));
    reads.issues = BOTTLENECK_ISSUES;
    reads.epics = [];
    const screen = await renderFocus();
    const text = messages.focus.bottlenecks;
    const section = screen.getByRole("region", { name: text.title, exact: true });
    // 제목은 후보 행마다 달라서, 다른 행의 마감 근거 줄에 섞여 맞지 않습니다.
    const row = (title: string) => section.getByRole("listitem").filter({ hasText: title });
    const order = () =>
      [...section.getByRole("listitem").elements()].map(
        (item) => item.querySelector("a")!.getAttribute("aria-label")!.split(" ")[0],
      );

    await expect.element(section).toMatchTextContent(text.order(BOTTLENECK_ORDER));
    expect(order()).toEqual(["desk-base", "desk-other", "desk-undated-prior", "desk-fourth-prior"]);

    const base = row("기준 작업");
    await expect
      .element(base.getByTitle(text.state(messages.workStates.labels.ready)))
      .toHaveTextContent(messages.workStates.labels.ready);
    await expect.element(base).toMatchTextContent(messages.issue.waiters(2));
    await expect.element(base).toMatchTextContent(text.unblocks(1));
    await expect.element(base).toMatchTextContent(/→ 오늘 마감 · desk-tonight 오늘 밤 후속 ·/);
    await expect.element(base).toMatchTextContent(/→ 3일 이내 · desk-joined 합류 후속 ·/);
    await expect
      .element(base.getByRole("link", { name: text.openGraphOf("desk-base"), exact: true }))
      .toHaveAttribute("href", "/w/demo/focus?center=desk-base&returnTo=%2Ffocus");

    const other = row("다른 선행 작업");
    await expect
      .element(other.getByTitle(text.state(messages.workStates.labels.in_progress)))
      .toBeVisible();
    await expect.element(other).toMatchTextContent(text.unblocks(0));
    await expect.element(other).toMatchTextContent(/→ 3일 이내 · desk-joined/);
    await expect.element(row("마감 없는 선행")).not.toMatchTextContent(DUE_EVIDENCE);
    await expect.element(row("넷째 날 선행")).not.toMatchTextContent(DUE_EVIDENCE);

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    await expect.element(base).toMatchTextContent(/→ 기한 초과 · desk-tonight/);
    await expect.element(base).toMatchTextContent(/→ 오늘 마감 · desk-joined/);
    await expect
      .element(row("넷째 날 선행"))
      .toMatchTextContent(/→ 3일 이내 · desk-fourth-after 넷째 날 후속 ·/);
    expect(order()).toEqual(["desk-base", "desk-other", "desk-fourth-prior", "desk-undated-prior"]);
  });

  test("후보는 정렬한 순서로 앞의 5개만 보이고, 그보다 많을 때만 모두 보기로 나머지를 펼치거나 다시 접는다", async () => {
    // 후보마다 후속 이슈를 하나씩 막아 다른 기준이 같으므로, 만든 시각 순으로 desk-prior-0부터 놓입니다.
    const blockingPairs = (count: number) =>
      Array.from({ length: count }, (_, index) => [
        issue(`desk-prior-${index}`, { title: `선행 ${index}`, ready: true, createdAt: index }),
        issue(`desk-after-${index}`, {
          title: `후속 ${index}`,
          blockedBy: [`desk-prior-${index}`],
        }),
      ]).flat();
    reads.issues = blockingPairs(6);
    reads.epics = [];
    const screen = await renderFocus();
    const text = messages.focus.bottlenecks;
    const section = screen.getByRole("region", { name: text.title, exact: true });
    const shownIds = () =>
      [...section.getByRole("listitem").elements()].map(
        (item) => item.querySelector("a")!.getAttribute("aria-label")!.split(" ")[0],
      );
    // 행마다 ID 복사 단추가 있으므로, 펼침 상태를 알리는 단추로 모두 보기를 찾습니다.
    const seeAll = section.getByRole("button", { expanded: false });
    const showFewer = section.getByRole("button", { expanded: true });
    const firstFive = [0, 1, 2, 3, 4].map((index) => `desk-prior-${index}`);

    await expect.element(section.getByRole("listitem")).toHaveLength(5);
    expect(shownIds()).toEqual(firstFive);
    await expect.element(section.getByRole("heading")).toMatchTextContent("6");
    await expect.element(seeAll).toHaveTextContent(messages.focus.list.seeAll(6));

    await seeAll.click();
    await expect.element(section.getByRole("listitem")).toHaveLength(6);
    expect(shownIds()).toEqual([...firstFive, "desk-prior-5"]);
    await expect.element(showFewer).toHaveTextContent(messages.focus.list.showFewer);

    await showFewer.click();
    await expect.element(section.getByRole("listitem")).toHaveLength(5);
    await expect.element(seeAll).toBeVisible();

    reads.issues = blockingPairs(5);
    await screen.rerender(
      <LocaleProvider locale="ko">
        <FocusScreen />
      </LocaleProvider>,
    );
    await expect.element(section.getByRole("listitem")).toHaveLength(5);
    await expect.element(seeAll).not.toBeInTheDocument();
  });

  test("영어 화면은 정렬 기준과 계산 결과를 영어로 보이고, 막고 있는 이슈가 없으면 빈 안내를 보인다", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 30, 23, 0));
    reads.issues = BOTTLENECK_ISSUES;
    reads.epics = [];
    const screen = await renderFocus("en");
    const text = enMessages.focus.bottlenecks;
    const section = screen.getByRole("region", { name: text.title, exact: true });

    await expect.element(section).toMatchTextContent(text.order(BOTTLENECK_ORDER));
    await expect.element(section).toMatchTextContent(enMessages.issue.waiters(2));
    await expect.element(section).toMatchTextContent(text.unblocks(1));
    await expect.element(section).toMatchTextContent(/→ Due today · desk-tonight/);
    await expect
      .element(section.getByRole("link", { name: text.openGraphOf("desk-base"), exact: true }))
      .toHaveTextContent(`${enMessages.graph.scopes.center} →`);

    reads.issues = [issue("desk-alone", { ready: true })];
    await screen.rerender(
      <LocaleProvider locale="en">
        <FocusScreen />
      </LocaleProvider>,
    );
    await expect.element(section).toMatchTextContent(text.empty);
  });
});

describe("두 열 높이", () => {
  // lg(1024px) 이상에서 두 열로 나뉘고, 그보다 좁으면 한 열로 쌓입니다.
  const WIDE = { width: 1440, height: 900 };
  const NARROW = { width: 900, height: 900 };

  afterEach(async () => {
    await page.viewport(WIDE.width, WIDE.height);
  });

  // 진행 중 두 개가 막힘 다섯 개를 막아, 오른쪽 열(병목, 막힘)에 왼쪽 열보다 훨씬 많은 줄이 생깁니다. 바로 작업 가능과 마감은 비어 있습니다.
  const BLOCKED_HEAVY = [
    issue("desk-doing-1", { title: "진행 하나", status: "in_progress" }),
    issue("desk-doing-2", { title: "진행 둘", status: "in_progress" }),
    ...Array.from({ length: 5 }, (_, index) =>
      issue(`desk-waiting-${index}`, {
        title: `기다리는 작업 ${index}`,
        blockedBy: ["desk-doing-1", "desk-doing-2"],
      }),
    ),
  ];
  // 오른쪽 열이 비고, 왼쪽 열의 다음에 할 일만 다섯 줄입니다.
  const READY_HEAVY = Array.from({ length: 5 }, (_, index) =>
    issue(`desk-ready-${index}`, { title: `바로 할 작업 ${index}`, ready: true }),
  );

  /** 구역 제목 아래에 놓인 목록 칸(목록, 빈 안내, 마감 안내)입니다. */
  function listBox(screen: Awaited<ReturnType<typeof renderFocus>>, name: string): HTMLElement {
    return screen.getByRole("region", { name, exact: true }).element()
      .lastElementChild as HTMLElement;
  }

  test("넓은 창에서는 어느 쪽 열에 이슈가 몰려도 두 열의 마지막 목록 칸이 같은 높이에서 끝난다", async () => {
    reads.epics = [];
    for (const issues of [BLOCKED_HEAVY, READY_HEAVY]) {
      reads.issues = issues;
      const screen = await renderFocus();
      const leftBottom = listBox(screen, messages.focus.deadlines.title).getBoundingClientRect()
        .bottom;
      const rightBottom = listBox(
        screen,
        messages.workStates.labels.blocked,
      ).getBoundingClientRect().bottom;

      expect(Math.abs(leftBottom - rightBottom)).toBeLessThanOrEqual(1);
      await screen.unmount();
    }
  });

  test("넓은 창에서 칸을 넘는 목록은 칸 안에서 스크롤하고, 빈 구역은 이슈가 있는 구역과 같은 칸 높이를 차지한다", async () => {
    reads.issues = BLOCKED_HEAVY;
    reads.epics = [];
    const screen = await renderFocus();
    const blocked = listBox(screen, messages.workStates.labels.blocked);
    const emptyReady = listBox(screen, messages.focus.nextUp);
    const inProgress = listBox(screen, messages.focus.inProgress);

    expect(blocked.scrollHeight).toBeGreaterThan(blocked.clientHeight);
    expect(emptyReady).toHaveTextContent(messages.focus.readyEmpty);
    expect(emptyReady.getBoundingClientRect().height).toBe(
      inProgress.getBoundingClientRect().height,
    );
  });

  test("한 열로 쌓이는 좁은 창에서는 칸 높이를 고정하지 않고, 칸을 넘는 목록만 최대 높이 안에서 스크롤한다", async () => {
    await page.viewport(NARROW.width, NARROW.height);
    reads.issues = BLOCKED_HEAVY;
    reads.epics = [];
    const screen = await renderFocus();
    const blocked = listBox(screen, messages.workStates.labels.blocked);
    const emptyReady = listBox(screen, messages.focus.nextUp);
    const inProgress = listBox(screen, messages.focus.inProgress);

    expect(blocked.scrollHeight).toBeGreaterThan(blocked.clientHeight);
    expect(blocked.getBoundingClientRect().height).toBeLessThan(blocked.scrollHeight);
    expect(emptyReady.getBoundingClientRect().height).toBeLessThan(
      inProgress.getBoundingClientRect().height,
    );
  });
});

test.each([
  ["ko", messages],
  ["en", enMessages],
] as const)(
  "%s 화면의 요약 칩은 모두 같은 너비이고, 세 자리 개수가 붙어도 어느 칩의 이름도 잘리거나 넘치지 않는다",
  async (locale, text) => {
    // 바로 작업 가능 120개로 세 자리 개수를 만듭니다.
    reads.issues = Array.from({ length: 120 }, (_, index) =>
      issue(`desk-ready-${index}`, { title: `바로 할 작업 ${index}`, ready: true }),
    );
    reads.epics = [];
    const screen = await renderFocus(locale);
    const summary = screen.getByRole("navigation", { name: text.focus.summary });
    const chips = summary.getByRole("link").elements();

    // 너비를 맞추려고 겹쳐 둔 다른 칩 이름은 접근 가능한 이름에 섞이지 않습니다.
    await expect
      .element(
        summary.getByRole("link", { name: `${text.workStates.labels.ready} 120`, exact: true }),
      )
      .toBeVisible();
    const widths = chips.map((chip) => chip.getBoundingClientRect().width);
    for (const width of widths) expect(width).toBeCloseTo(widths[0]!, 0);
    for (const chip of chips) expect(chip.scrollWidth).toBeLessThanOrEqual(chip.clientWidth);
  },
);
