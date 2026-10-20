import type { Issue, IssueDetail, IssueLink } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { ToastRegion } from "@/client/ui/designSystem/Toast";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { AppLayoutFixture } from "@/client/ui/shell/AppLayoutFixture";
import type { HumanGateSummary } from "@/shared/contract/humanGates";
import { issue, issueDetail } from "@/shared/domain/issues/issueFixture";
import { HumanDecisionsScreen } from "./HumanDecisionsScreen";

const QUESTION_ID = "desk-q1";
const QUESTION_TITLE = "인증 방식을 정해 주세요";
// 알림은 테스트가 끝나도 5초 동안 남으므로, 테스트마다 다른 id로 알림 문구를 구분합니다.
const DIALOG_QUESTION_ID = "desk-q2";
const WORK_ID = "desk-w1";
const GATE_ID = "desk-g1";
const GATE_TITLE = `Review: ${WORK_ID}`;

/** 화면이 서버에서 읽을 이슈 목록, 열린 gate, id별 상세와 주소 query입니다. 테스트가 다시 조회한 결과로 바꾼 뒤 다시 렌더링합니다. */
const reads = vi.hoisted(() => ({
  issues: [] as Issue[],
  gates: [] as HumanGateSummary[],
  details: {} as Record<string, IssueDetail>,
  search: new URLSearchParams(),
}));

/** Server Action을 실행하지 않고 쓰기가 성공한 것으로 돌려줍니다. */
const SUCCEEDING_WRITES: IssueWrites = {
  pending: false,
  error: null,
  dismissError: () => {},
  run: async <R,>() => ({ ok: true, data: null }) as R,
};

// 화면이 서버에서 읽는 목록·상세와 쓰기, 주소를 읽는 부분은 고정 값으로 바꿉니다.
// 화면 위에서 연 상세 dialog도 검사하므로 IssueDetailRoute는 바꾸지 않고, 주소 query에 issue가 없으면 dialog가 열리지 않습니다.
vi.mock("@/client/modules/issues/application/useIssueList", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/client/modules/issues/application/useIssueList")>()),
  useIssueList: () => ({ data: reads.issues, error: null, loading: false }),
}));
vi.mock("@/client/modules/issues/application/useIssueDetail", () => ({
  useIssueDetail: (id: string) => ({
    data: reads.details[id] ?? null,
    error: null,
    loading: false,
  }),
}));
vi.mock("@/client/modules/humanGates/application/useHumanGates", () => ({
  useHumanGates: () => ({ data: reads.gates, error: null, loading: false }),
}));
vi.mock("@/client/modules/humanDecisions/application/useHumanDecisionCount", () => ({
  useHumanDecisionCount: () => ({
    data: reads.issues.length + reads.gates.length,
    error: null,
    loading: false,
  }),
}));
vi.mock("@/client/modules/issues/application/useIssueWrites", () => ({
  useIssueWrites: () => SUCCEEDING_WRITES,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ workspace: "demo" }),
  usePathname: () => "/w/demo/human",
  useSearchParams: () => reads.search,
  // 화면이 바꾼 주소를 다음 렌더링에서 읽도록 query만 옮겨 둡니다.
  useRouter: () => ({
    push: () => {},
    replace: (href: string) => {
      reads.search = new URLSearchParams(href.split("?")[1] ?? "");
    },
  }),
}));

test("응답한 질문의 상세가 목록보다 먼저 닫힌 상태로 조회돼도 알리지 않고, 목록에서 행이 빠질 때 알린다", async () => {
  const fields = { title: QUESTION_TITLE, labels: ["human"] };
  reads.issues = [issue(QUESTION_ID, fields)];
  reads.gates = [];
  reads.details = { [QUESTION_ID]: issueDetail(QUESTION_ID, fields) };
  reads.search = new URLSearchParams();
  const screen = await render(<Screen />);
  const row = screen.getByRole("button", { name: `${QUESTION_ID} ${QUESTION_TITLE}` });
  const notice = messages.humanDecision.responded(QUESTION_ID);

  await screen.getByRole("textbox", { name: messages.humanDecision.response }).click();
  await userEvent.keyboard("OAuth2로 진행해 주세요");
  const respond = screen.getByRole("button", { name: messages.humanDecision.respond });
  await respond.click();
  await expect.element(respond).toBeDisabled();

  reads.details = { [QUESTION_ID]: issueDetail(QUESTION_ID, { ...fields, status: "closed" }) };
  await screen.rerender(<Screen />);
  // 알림은 5초 뒤 사라지므로, 사라질 때까지 기다리며 통과하지 않도록 다시 렌더링한 직후의 화면을 한 번만 읽습니다.
  expect(row.query()).not.toBeNull();
  expect(screen.getByRole("status").element().textContent).not.toContain(notice);

  reads.issues = [];
  await screen.rerender(<Screen />);
  await expect.element(screen.getByRole("status")).toHaveTextContent(notice);
  await expect.element(row).not.toBeInTheDocument();
});

test("판단 기다림 화면 위에서 연 dialog에서 응답한 질문은 상세가 먼저 닫힌 상태로 조회돼도 알리지 않고, 뒤쪽 목록에서 행이 빠질 때 알린다", async () => {
  const fields = { title: QUESTION_TITLE, labels: ["human"] };
  reads.issues = [issue(DIALOG_QUESTION_ID, fields)];
  reads.gates = [];
  reads.details = { [DIALOG_QUESTION_ID]: issueDetail(DIALOG_QUESTION_ID, fields) };
  reads.search = new URLSearchParams({ item: DIALOG_QUESTION_ID, issue: DIALOG_QUESTION_ID });
  const screen = await render(<Screen />);
  const dialog = screen.getByRole("dialog", {
    name: messages.issueDetail.dialog(DIALOG_QUESTION_ID),
  });
  const row = screen.getByRole("button", { name: `${DIALOG_QUESTION_ID} ${QUESTION_TITLE}` });
  const notice = messages.humanDecision.responded(DIALOG_QUESTION_ID);

  await dialog.getByRole("textbox", { name: messages.humanDecision.response }).click();
  await userEvent.keyboard("OAuth2로 진행해 주세요");
  const respond = dialog.getByRole("button", { name: messages.humanDecision.respond });
  await respond.click();
  await expect.element(respond).toBeDisabled();

  reads.details = {
    [DIALOG_QUESTION_ID]: issueDetail(DIALOG_QUESTION_ID, { ...fields, status: "closed" }),
  };
  await screen.rerender(<Screen />);
  // 알림은 5초 뒤 사라지므로, 사라질 때까지 기다리며 통과하지 않도록 다시 렌더링한 직후의 화면을 한 번만 읽습니다.
  expect(row.query()).not.toBeNull();
  expect(screen.getByRole("status").element().textContent).not.toContain(notice);

  reads.issues = [];
  await screen.rerender(<Screen />);
  await expect.element(screen.getByRole("status")).toHaveTextContent(notice);
  await expect.element(row).not.toBeInTheDocument();
});

test("판단 기다림 화면 위에서 막힌 작업의 dialog를 열고 gate에 응답하면, 작업 상세에서 gate가 먼저 닫혀도 알리지 않고 뒤쪽 목록에서 gate 행이 빠질 때 알린다", async () => {
  const gateLink = (status: string): IssueLink => ({
    id: GATE_ID,
    title: GATE_TITLE,
    status,
    priority: 2,
    issueType: "gate",
    dependencyType: "blocks",
    awaitType: "human",
  });
  const work = (gateStatus: string) =>
    issueDetail(WORK_ID, {
      title: "로그인 화면 다시 그리기",
      dependencies: [gateLink(gateStatus)],
    });
  reads.issues = [];
  reads.gates = [
    {
      gate: issue(GATE_ID, { title: GATE_TITLE, issueType: "gate" }),
      reason: "",
      blocks: [issue(WORK_ID)],
      previousGateCount: 0,
    },
  ];
  reads.details = { [WORK_ID]: work("open") };
  reads.search = new URLSearchParams({ item: GATE_ID, issue: WORK_ID });
  const screen = await render(<Screen />);
  const gateItem = screen
    .getByRole("dialog", { name: messages.issueDetail.dialog(WORK_ID) })
    .getByRole("region", { name: GATE_TITLE });
  const row = screen.getByRole("button", { name: `${GATE_ID} ${GATE_TITLE}` });
  const notice = messages.humanDecision.responded(GATE_ID);

  await gateItem.getByRole("textbox", { name: messages.humanDecision.response }).click();
  await userEvent.keyboard("버튼 색을 바꿔 주세요");
  const respond = gateItem.getByRole("button", { name: messages.humanDecision.respond });
  await respond.click();
  await expect.element(respond).toBeDisabled();

  reads.details = { [WORK_ID]: work("closed") };
  await screen.rerender(<Screen />);
  expect(row.query()).not.toBeNull();
  expect(screen.getByRole("status").element().textContent).not.toContain(notice);

  reads.gates = [];
  await screen.rerender(<Screen />);
  await expect.element(screen.getByRole("status")).toHaveTextContent(notice);
  await expect.element(row).not.toBeInTheDocument();
});

/** 목록이 화면보다 길어 스크롤되도록 질문을 여러 개 심고, 고를 항목을 주소에 둡니다. 질문 본문은 패널이 화면 높이보다 길도록 문단을 여럿 둡니다. */
function seedLongList(selectedId: string) {
  const gate: HumanGateSummary = {
    gate: issue(GATE_ID, { title: GATE_TITLE, issueType: "gate" }),
    reason: "",
    blocks: [issue(WORK_ID)],
    previousGateCount: 0,
  };
  const questions = Array.from({ length: 20 }, (_, index) =>
    issue(`desk-s${index + 1}`, { title: `${index + 1}번째 질문`, labels: ["human"] }),
  );
  const description = Array.from({ length: 30 }, (_, index) => `${index + 1}번째 문단입니다.`).join(
    "\n\n",
  );
  reads.gates = [gate];
  reads.issues = questions;
  reads.details = Object.fromEntries(
    questions.map((question) => [
      question.id,
      issueDetail(question.id, { ...question, description }),
    ]),
  );
  reads.search = new URLSearchParams({ item: selectedId });
}

test("넓은 창에서 보던 gate나 질문이 닫혀 다음 항목으로 넘어가면 페이지 맨 위로 올라간다", async () => {
  await page.viewport(1440, 900);
  seedLongList(GATE_ID);
  const screen = await render(<ScreenInAppLayout />);

  window.scrollTo({ top: 600 });
  reads.gates = [];
  await screen.rerender(<ScreenInAppLayout />);
  await expect.element(screen.getByRole("region", { name: "1번째 질문" })).toBeInTheDocument();
  await expect.poll(() => window.scrollY).toBe(0);

  window.scrollTo({ top: 600 });
  reads.issues = reads.issues.slice(1);
  await screen.rerender(<ScreenInAppLayout />);
  await expect.element(screen.getByRole("region", { name: "2번째 질문" })).toBeInTheDocument();
  await expect.poll(() => window.scrollY).toBe(0);
});

test("좁은 창에서 보던 질문이 닫혀 다음 질문으로 넘어가면 목록 아래에 놓인 새 질문 패널의 맨 위가 상단 머리글 바로 아래에 보인다", async () => {
  await page.viewport(500, 900);
  seedLongList("desk-s1");
  reads.gates = [];
  const screen = await render(<ScreenInAppLayout />);

  window.scrollTo({ top: 300 });
  reads.issues = reads.issues.slice(1);
  await screen.rerender(<ScreenInAppLayout />);
  const panel = screen.getByRole("region", { name: "2번째 질문" });
  await expect.element(panel.getByText("30번째 문단입니다.")).toBeInTheDocument();
  const headerHeight = screen.getByRole("banner").element().getBoundingClientRect().height;
  await expect
    .poll(() => panel.element().getBoundingClientRect().top)
    .toBeGreaterThanOrEqual(headerHeight);
  expect(panel.element().getBoundingClientRect().top).toBeLessThan(headerHeight + 48);
});

test("페이지 끝까지 스크롤해도 상단 머리글이 화면 위에 붙어 있다", async () => {
  await page.viewport(800, 600);
  seedLongList(GATE_ID);
  const screen = await render(<ScreenInAppLayout />);

  window.scrollTo({ top: document.documentElement.scrollHeight });
  expect(window.scrollY, "한 화면 높이보다 많이 스크롤함").toBeGreaterThan(600);
  expect(screen.getByRole("banner").element().getBoundingClientRect().top).toBe(0);
});

test("목록에서 다른 항목을 눌러 고르면 스크롤이 움직이지 않는다", async () => {
  await page.viewport(1440, 900);
  seedLongList(GATE_ID);
  const screen = await render(<ScreenInAppLayout />);
  const row = screen.getByRole("button", { name: "desk-s10 10번째 질문" });
  row.element().scrollIntoView({ block: "center" });
  const scrollY = window.scrollY;
  expect(scrollY).toBeGreaterThan(0);

  await row.click();
  await screen.rerender(<ScreenInAppLayout />);
  await expect.element(screen.getByRole("region", { name: "10번째 질문" })).toBeInTheDocument();
  expect(window.scrollY).toBe(scrollY);
});

function ScreenInAppLayout() {
  return (
    <LocaleProvider locale="ko">
      <AppLayoutFixture>
        <Screen />
      </AppLayoutFixture>
    </LocaleProvider>
  );
}

function Screen() {
  return (
    <LocaleProvider locale="ko">
      <HumanDecisionsScreen />
      <ToastRegion />
    </LocaleProvider>
  );
}
