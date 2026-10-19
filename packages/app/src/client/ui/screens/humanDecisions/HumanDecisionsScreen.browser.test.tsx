import type { Issue, IssueDetail } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { ToastRegion } from "@/client/ui/designSystem/Toast";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { issue, issueDetail } from "@/shared/domain/issues/issueFixture";
import { HumanDecisionsScreen } from "./HumanDecisionsScreen";

const QUESTION_ID = "desk-q1";
const QUESTION_TITLE = "인증 방식을 정해 주세요";

/** 화면이 서버에서 읽을 이슈 목록과 질문 상세입니다. 테스트가 다시 조회한 결과로 바꾼 뒤 다시 렌더링합니다. */
const reads = vi.hoisted(() => ({
  issues: [] as Issue[],
  detail: null as IssueDetail | null,
}));

/** Server Action을 실행하지 않고 쓰기가 성공한 것으로 돌려줍니다. */
const SUCCEEDING_WRITES: IssueWrites = {
  pending: false,
  error: null,
  dismissError: () => {},
  run: async <R,>() => ({ ok: true, data: null }) as R,
};

// 화면이 서버에서 읽는 목록·상세와 쓰기, 주소를 읽는 부분은 고정 값으로 바꿉니다.
vi.mock("@/client/modules/issues/application/useIssueList", () => ({
  useIssueList: () => ({ data: reads.issues, error: null, loading: false }),
}));
vi.mock("@/client/modules/issues/application/useIssueDetail", () => ({
  useIssueDetail: () => ({ data: reads.detail, error: null, loading: false }),
}));
vi.mock("@/client/modules/humanGates/application/useHumanGates", () => ({
  useHumanGates: () => ({ data: [], error: null, loading: false }),
}));
vi.mock("@/client/modules/humanDecisions/application/useHumanDecisionCount", () => ({
  useHumanDecisionCount: () => ({ data: reads.issues.length, error: null, loading: false }),
}));
vi.mock("@/client/modules/issues/application/useIssueWrites", () => ({
  useIssueWrites: () => SUCCEEDING_WRITES,
}));
vi.mock("@/client/ui/issues/IssueDetailRoute", () => ({
  IssueDetailRoute: () => null,
  useIssueHref: () => (id: string) => `/human?issue=${id}`,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/human",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}));

test("응답한 질문의 상세가 목록보다 먼저 닫힌 상태로 조회돼도 알리지 않고, 목록에서 행이 빠질 때 알린다", async () => {
  const fields = { title: QUESTION_TITLE, labels: ["human"] };
  reads.issues = [issue(QUESTION_ID, fields)];
  reads.detail = issueDetail(QUESTION_ID, fields);
  const screen = await render(<Screen />);
  const row = screen.getByRole("button", { name: `${QUESTION_ID} ${QUESTION_TITLE}` });
  const notice = messages.humanDecision.responded(QUESTION_ID);

  await screen.getByRole("textbox", { name: messages.humanDecision.response }).click();
  await userEvent.keyboard("OAuth2로 진행해 주세요");
  const respond = screen.getByRole("button", { name: messages.humanDecision.respond });
  await respond.click();
  await expect.element(respond).toBeDisabled();

  reads.detail = issueDetail(QUESTION_ID, { ...fields, status: "closed" });
  await screen.rerender(<Screen />);
  // 알림은 5초 뒤 사라지므로, 사라질 때까지 기다리며 통과하지 않도록 다시 렌더링한 직후의 화면을 한 번만 읽습니다.
  expect(row.query()).not.toBeNull();
  expect(screen.getByRole("status").element().textContent).not.toContain(notice);

  reads.issues = [];
  await screen.rerender(<Screen />);
  await expect.element(screen.getByRole("status")).toHaveTextContent(notice);
  await expect.element(row).not.toBeInTheDocument();
});

function Screen() {
  return (
    <LocaleProvider locale="ko">
      <HumanDecisionsScreen />
      <ToastRegion />
    </LocaleProvider>
  );
}
