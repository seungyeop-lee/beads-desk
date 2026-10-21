import type { Issue } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
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

// 화면이 서버에서 읽는 목록과 주소, 상세 dialog를 여는 부분은 고정 값으로 바꿉니다.
vi.mock("@/client/modules/issues/application/useIssueList", () => ({
  useIssueList: () => ({ data: ISSUES, error: null, loading: false }),
}));
vi.mock("@/client/modules/epics/application/useEpics", () => ({
  useEpics: () => ({ data: [], error: null, loading: false }),
}));
vi.mock("@/client/modules/humanDecisions/application/useHumanDecisionCount", () => ({
  useHumanDecisionCount: () => ({ data: 0, error: null, loading: false }),
}));
vi.mock("@/client/modules/humanGates/application/useGateTitles", () => ({
  useGateTitles: () => new Map(),
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

const WAITERS = /\d+개 대기/;

test("다음에 할 일은 같은 우선순위에서 대기 수가 많은 이슈부터 보이고, 진행 중·다음에 할 일·막힘의 행은 기다리는 이슈가 있을 때만 대기 수를 보인다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <FocusScreen />
    </LocaleProvider>,
  );
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
