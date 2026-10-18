import type { Issue } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import type { EpicDescendants, EpicSummary } from "@/shared/contract/epics";
import { issue } from "@/shared/domain/issues/issueFixture";
import { EpicsScreen } from "./EpicsScreen";

const EPICS: EpicSummary[] = [
  { epic: epic("desk-ten", "하위 이슈 열 개 에픽"), totalChildren: 10, closedChildren: 10 },
  { epic: epic("desk-hundred", "하위 이슈 백 개 에픽"), totalChildren: 100, closedChildren: 100 },
];

/** 테스트마다 화면이 서버에서 읽을 에픽 목록과 에픽별 후손 이슈를 정합니다. 후손이 없는 에픽은 읽는 중으로 둡니다. */
const reads = vi.hoisted(() => ({
  epics: [] as EpicSummary[],
  descendants: {} as Record<string, EpicDescendants>,
}));

// 화면이 서버에서 읽는 에픽 목록과, 주소를 읽어 상세 dialog를 여는 부분은 고정 값으로 바꿉니다.
vi.mock("@/client/modules/epics/application/useEpics", () => ({
  useEpics: () => ({ data: reads.epics, error: null, loading: false }),
  useEpicDescendants: (epicId: string) => {
    const data = reads.descendants[epicId];
    return data
      ? { data, error: null, loading: false }
      : { data: null, error: null, loading: true };
  },
}));
vi.mock("@/client/modules/humanGates/application/useGateTitles", () => ({
  useGateTitles: () => new Map(),
}));
vi.mock("@/client/ui/issues/IssueDetailRoute", () => ({
  IssueDetailRoute: () => null,
  useIssueHref: () => (id: string) => `/epics?issue=${id}`,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/epics",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}));

// 좁은 두 창은 Chrome 110%·100%에서 가장 좁힌 창입니다. 넓은 창에서는 에픽 헤더가 xl 배치로 한 줄에 놓입니다.
for (const width of [455, 500, 1440]) {
  test(`창 폭 ${width}px에서 하위 이슈가 두 자리·세 자리인 에픽의 진행 개수가 한 줄로 카드 안에 보인다`, async () => {
    reads.epics = EPICS;
    await page.viewport(width, 900);
    const screen = await render(
      <LocaleProvider locale="ko">
        <EpicsScreen />
      </LocaleProvider>,
    );

    for (const countText of ["10/10 · 100%", "100/100 · 100%"]) {
      const count = screen.getByText(countText, { exact: true }).element();
      const card = count.closest("section")!.getBoundingClientRect();
      const box = count.getBoundingClientRect();
      expect(lineCount(count), `${width}px ${countText} 줄 수`).toBe(1);
      expect(box.left).toBeGreaterThanOrEqual(card.left);
      expect(box.right).toBeLessThanOrEqual(card.right);
    }
    expect(document.documentElement.scrollWidth, `${width}px 페이지 가로 넘침`).toBe(
      document.documentElement.clientWidth,
    );
  });
}

test("닫힌 에픽만 있으면 처음 열 때 하위 이슈 목록이 접혀 있고, 펼치기 단추로 펼칠 수 있다", async () => {
  reads.epics = [
    {
      epic: issue("desk-done", { title: "끝난 에픽", issueType: "epic", status: "closed" }),
      totalChildren: 1,
      closedChildren: 1,
    },
  ];
  reads.descendants = {
    "desk-done": {
      issues: [
        issue("desk-done.1", { title: "끝난 에픽의 작업", status: "closed", parent: "desk-done" }),
      ],
      waiters: {},
    },
  };
  const screen = await renderScreen();

  const toggle = screen.getByRole("button", { name: "desk-done 하위 이슈 펼치기" });
  await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
  await expect
    .element(screen.getByRole("link", { name: "끝난 에픽의 작업" }))
    .not.toBeInTheDocument();

  await toggle.click();
  await expect
    .element(screen.getByRole("button", { name: "desk-done 하위 이슈 접기" }))
    .toHaveAttribute("aria-expanded", "true");
  await expect.element(screen.getByRole("link", { name: "끝난 에픽의 작업" })).toBeVisible();
});

test("펼친 에픽의 기능은 처음에 접혀 있고, 펼치면 기능 아래 작업이 보이고 접으면 다시 숨는다", async () => {
  reads.epics = [
    {
      epic: issue("desk-epic", { title: "묶음 에픽", issueType: "epic" }),
      totalChildren: 1,
      closedChildren: 0,
    },
  ];
  reads.descendants = {
    "desk-epic": {
      issues: [
        issue("desk-epic.1", {
          title: "에픽 아래 기능",
          issueType: "feature",
          parent: "desk-epic",
        }),
        issue("desk-epic.1.1", { title: "기능 아래 작업", parent: "desk-epic.1" }),
      ],
      waiters: {},
    },
  };
  const screen = await renderScreen();
  const nested = screen.getByRole("link", { name: "기능 아래 작업" });

  await expect.element(screen.getByRole("link", { name: "에픽 아래 기능" })).toBeVisible();
  const toggle = screen.getByRole("button", { name: "desk-epic.1 하위 이슈 펼치기" });
  await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
  await expect.element(nested).not.toBeInTheDocument();

  await toggle.click();
  await expect.element(nested).toBeVisible();

  await screen.getByRole("button", { name: "desk-epic.1 하위 이슈 접기" }).click();
  await expect.element(nested).not.toBeInTheDocument();
});

function renderScreen() {
  return render(
    <LocaleProvider locale="ko">
      <EpicsScreen />
    </LocaleProvider>,
  );
}

/**
 * 글자가 몇 줄에 나뉘어 놓였는지 셉니다.
 * 칸이 글자보다 좁으면 글자가 칸 밖으로 넘치지 않고 다음 줄로 넘어가므로, 상자 경계만 비교해서는 이 상태를 찾지 못합니다.
 */
function lineCount(element: Element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
}

function epic(id: string, title: string): Issue {
  return issue(id, { title, issueType: "epic" });
}
