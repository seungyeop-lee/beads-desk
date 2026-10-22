import { afterEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import type { HumanGateSummary, PreviousGateRound } from "@/shared/contract/humanGates";
import { issue, issueDetail } from "@/shared/domain/issues/issueFixture.testkit";
import { HumanGateDecision } from "./HumanGateDecision";

const WORK = issue("desk-work", { title: "로그인 화면 다시 그리기" });
const ROUNDS: PreviousGateRound[] = [
  {
    gate: issue("desk-g1", { title: "Review: desk-work", issueType: "gate", status: "closed" }),
    closeReason: "Responded",
    comments: [{ id: "c-1", author: "minji", text: "Response: 간격 조정 요청", createdAt: 0 }],
  },
];

// 컴포넌트가 서버에서 읽는 이전 라운드와 막고 있는 작업의 상세, 주소를 읽는 상세 링크는 고정 값으로 바꿉니다.
vi.mock("@/client/modules/humanGates/application/usePreviousGateRounds", () => ({
  usePreviousGateRounds: () => ({ data: ROUNDS, error: null, loading: false }),
}));
vi.mock("@/client/modules/issues/application/useIssueDetail", () => ({
  useIssueDetail: (id: string) => ({ data: issueDetail(id), error: null, loading: false }),
}));
vi.mock("@/client/ui/issues/IssueDetailRoute", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).issueDetailRouteMock("/human"),
);

afterEach(() => {
  vi.unstubAllGlobals();
});

for (const { previousGateCount, sections } of [
  {
    previousGateCount: 1,
    sections: [
      messages.humanGate.reason,
      messages.humanGate.responseTitle,
      messages.humanGate.previousFeedback,
      messages.humanGate.blocks,
    ],
  },
  {
    previousGateCount: 0,
    sections: [
      messages.humanGate.reason,
      messages.humanGate.responseTitle,
      messages.humanGate.blocks,
    ],
  },
]) {
  test(`이전 라운드가 ${previousGateCount}개인 gate의 상세는 ${sections.join(", ")} 순으로 보인다`, async () => {
    const summary: HumanGateSummary = {
      gate: issue("desk-g2", { title: "Review: desk-work", issueType: "gate" }),
      reason: "로그인 화면 수정 결과",
      blocks: [WORK],
      previousGateCount,
    };
    const screen = await render(
      <LocaleProvider locale="ko">
        <HumanGateDecision summary={summary} />
      </LocaleProvider>,
    );

    await expect
      .element(screen.getByRole("region", { name: messages.humanGate.blocks }))
      .toBeVisible();
    const decision = screen
      .getByRole("region", { name: summary.gate.title, exact: true })
      .element();
    expect(directSectionNames(decision)).toEqual(sections);
  });
}

test("gate 상세는 머리글에 gate의 ID를, 막고 있는 작업 목록에 작업의 ID를 복사 단추로 보인다", async () => {
  const summary: HumanGateSummary = {
    gate: issue("desk-g2", { title: "Review: desk-work", issueType: "gate" }),
    reason: "로그인 화면 수정 결과",
    blocks: [WORK],
    previousGateCount: 0,
  };
  const screen = await render(
    <LocaleProvider locale="ko">
      <HumanGateDecision summary={summary} />
    </LocaleProvider>,
  );
  const decision = screen.getByRole("region", { name: summary.gate.title, exact: true });

  await expect
    .element(
      page
        .elementLocator(decision.element().querySelector("header")!)
        .getByRole("button", { name: messages.copyId.labelOf("desk-g2") }),
    )
    .toBeVisible();
  await expect
    .element(
      decision
        .getByRole("region", { name: messages.humanGate.blocks })
        .getByRole("button", { name: messages.copyId.labelOf(WORK.id) }),
    )
    .toBeVisible();
});

test("gate 사유의 로그 파일 링크는 펼치기 버튼으로 사유 안에서 파일 내용을 펼친다", async () => {
  vi.stubGlobal("fetch", async () => new Response("리뷰 로그 첫 줄"));
  const summary: HumanGateSummary = {
    gate: issue("desk-g2", { title: "Review: desk-work", issueType: "gate" }),
    reason: "검증 결과는 [실행 로그](/tmp/review/run.log)에 있습니다.",
    blocks: [WORK],
    previousGateCount: 0,
  };
  const screen = await render(
    <LocaleProvider locale="ko">
      <HumanGateDecision summary={summary} />
    </LocaleProvider>,
  );
  const reason = screen.getByRole("region", { name: messages.humanGate.reason });

  await userEvent.click(
    reason.getByRole("button", { name: messages.markdownEditor.filePreview("실행 로그") }),
  );

  await expect
    .element(
      reason.getByRole("region", {
        name: messages.markdownEditor.filePreviewContents("실행 로그"),
      }),
    )
    .toHaveTextContent("리뷰 로그 첫 줄");
});

/** 상세 카드 직속 섹션의 접근 가능한 이름을 DOM 순서대로 모읍니다. 응답 섹션은 aria-labelledby로 제목을 가리킵니다. */
function directSectionNames(decision: Element) {
  return [...decision.querySelectorAll(":scope > section")].map((section) => {
    const labelledBy = section.getAttribute("aria-labelledby");
    const label = labelledBy ? document.getElementById(labelledBy)?.textContent : null;
    return section.getAttribute("aria-label") ?? label?.trim() ?? "";
  });
}
