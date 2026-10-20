import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import type { HygieneReport } from "@/shared/contract/hygiene";
import { issue } from "@/shared/domain/issues/issueFixture";
import { HygieneScreen } from "./HygieneScreen";

const ref = (id: string) => ({ id, title: `${id} 제목` });

// Missing sections 목록을 22건으로 채워, 그 카드가 다른 카드보다 훨씬 길어지게 합니다.
const REPORT: HygieneReport = {
  orphans: [
    { ...ref("desk-orphan"), status: "open", latestCommit: "abc1234", latestCommitMessage: "fix" },
  ],
  lint: Array.from({ length: 22 }, (_, index) => ({
    ...ref(`desk-lint${index}`),
    issueType: "task",
    missing: ["## Acceptance Criteria"],
  })),
  duplicates: [[ref("desk-dup1"), ref("desk-dup2")]],
  closableEpics: [issue("desk-epic", { title: "닫을 수 있는 에픽", issueType: "epic" })],
};

// 화면이 서버에서 읽는 점검 결과와, 주소를 읽어 상세 dialog를 여는 부분은 고정 값으로 바꿉니다.
vi.mock("@/client/modules/hygiene/application/useHygiene", () => ({
  useHygiene: () => ({ data: REPORT, error: null, loading: false }),
  useStaleIssues: () => ({
    data: [issue("desk-stale", { title: "오래된 이슈" })],
    error: null,
    loading: false,
  }),
}));
vi.mock("@/client/ui/issues/IssueDetailRoute", () => ({
  IssueDetailRoute: () => null,
  useIssueHref: () => (id: string) => `/hygiene?issue=${id}`,
}));

const CARD_TITLES = [
  messages.hygiene.stale.title,
  messages.hygiene.duplicates.title,
  messages.hygiene.lint.title,
  messages.hygiene.closableEpics.title,
  messages.hygiene.orphans.title,
];

async function cardTitleBoxes(width: number) {
  await page.viewport(width, 900);
  const screen = await render(
    <LocaleProvider locale="ko">
      <HygieneScreen />
    </LocaleProvider>,
  );
  return CARD_TITLES.map((title) => ({
    title,
    box: screen
      .getByRole("region", { name: title })
      .getByRole("heading")
      .element()
      .getBoundingClientRect(),
  }));
}

test("넓은 창에서는 Missing sections가 22건이어도 다섯 카드의 제목이 모두 첫 화면 안에 보인다", async () => {
  const boxes = await cardTitleBoxes(1440);

  for (const { title, box } of boxes) {
    expect(box.bottom, `${title} 제목의 아래 끝`).toBeLessThanOrEqual(window.innerHeight);
  }
});

test("좁은 창에서는 카드가 한 열에 Stale, Duplicates, Missing sections, Epics, Orphans 순서로 놓인다", async () => {
  const boxes = await cardTitleBoxes(500);

  const left = boxes[0].box.left;
  expect(boxes.map(({ box }) => box.left)).toEqual(boxes.map(() => left));
  const byTop = boxes.toSorted((a, b) => a.box.top - b.box.top).map(({ title }) => title);
  expect(byTop).toEqual(CARD_TITLES);
});
