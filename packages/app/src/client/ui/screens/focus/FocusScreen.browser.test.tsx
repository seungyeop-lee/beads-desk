import type { Issue } from "@beads-desk/bd/issue";
import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import type { GateTitles } from "@/client/modules/humanGates/domain/humanGateBlockers";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
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
vi.mock("@/client/modules/humanGates/application/useGateTitles", () => ({
  useGateTitles: () => reads.gateTitles,
}));
vi.mock("@/client/ui/issues/IssueDetailRoute", () => ({
  IssueDetailRoute: () => null,
  useIssueHref: () => (id: string) => `/focus?issue=${id}`,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ workspace: "demo" }),
  usePathname: () => "/w/demo/focus",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}));

// 열린 gate를 정하지 않은 테스트는 gate 없이 그립니다.
beforeEach(() => {
  reads.gateTitles = new Map();
});

const WAITERS = /\d+개 대기/;

function renderFocus() {
  return render(
    <LocaleProvider locale="ko">
      <FocusScreen />
    </LocaleProvider>,
  );
}

test("다음에 할 일은 같은 우선순위에서 대기 수가 많은 이슈부터 보이고, 진행 중·다음에 할 일·막힘의 행은 기다리는 이슈가 있을 때만 대기 수를 보인다", async () => {
  reads.issues = ISSUES;
  reads.epics = [];
  const screen = await renderFocus();
  const rowText = (id: string, title: string) =>
    screen
      .getByRole("link", { name: `${id} ${title}`, exact: true })
      .element()
      .closest("li")!.textContent;
  const nextUp = screen
    .getByRole("region", { name: messages.focus.nextUp, exact: true })
    .getByRole("listitem");

  await expect.element(nextUp).toHaveLength(4);
  expect(nextUp.first().element()).toBe(
    screen.getByRole("link", { name: "desk-bottleneck 병목 작업" }).element().closest("li"),
  );
  expect(rowText("desk-bottleneck", "병목 작업")).toContain(messages.issue.waiters(2));
  for (const [id, title] of [
    ["desk-plain-1", "평범한 작업 하나"],
    ["desk-plain-2", "평범한 작업 둘"],
    ["desk-plain-3", "평범한 작업 셋"],
  ])
    expect(rowText(id!, title!)).not.toMatch(WAITERS);
  expect(rowText("desk-doing", "진행하는 작업")).toContain(messages.issue.waiters(1));
  expect(rowText("desk-middle", "중간 작업")).toContain(messages.issue.waiters(1));
  expect(rowText("desk-last", "마지막 작업")).not.toMatch(WAITERS);
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
    name: `${messages.focus.seeAllReady(6)} →`,
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
