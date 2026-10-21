import type { Issue } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import type { DecisionSummary } from "@/shared/contract/decisions";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { DecisionsScreen } from "./DecisionsScreen";

const KOREAN =
  "이슈를 작업 상태로 나눠 보이는 곳은 모두 같은 기준을 쓰고, 기준에는 bd 저장 상태와 의존 관계와 human 라벨을 씁니다";
const ENGLISH =
  "Decisions keep a long English title readable while status, supersession, and dates stay reachable";

/** 유효한 결정 둘과, 그 결정으로 대체되어 닫힌 결정 둘입니다. */
const DECISIONS: DecisionSummary[] = [
  { decision: decision("desk-ko-new", `새 ${KOREAN}`, "open"), supersededBy: null },
  { decision: decision("desk-en-new", `New ${ENGLISH}`, "open"), supersededBy: null },
  { decision: decision("desk-ko-old", `이전 ${KOREAN}`, "closed"), supersededBy: "desk-ko-new" },
  { decision: decision("desk-en-old", `Old ${ENGLISH}`, "closed"), supersededBy: "desk-en-new" },
];

// 화면이 서버에서 읽는 결정 목록과, 주소를 읽어 상세 dialog를 여는 부분은 고정 값으로 바꿉니다.
vi.mock("@/client/modules/decisions/application/useDecisions", () => ({
  useDecisions: () => ({ data: DECISIONS, error: null, loading: false }),
}));
vi.mock("@/client/ui/issues/IssueDetailRoute", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).issueDetailRouteMock(
    "/decisions",
  ),
);

/** e2e가 쓰던 창 폭입니다. Chrome 110%에서 폭 500px 창의 CSS viewport는 454px이고, 세로 scrollbar가 항상 보이면 441px입니다. */
const WIDTHS = [441, 454, 480, 500, 768, 1024, 1440];
/** 제목이 몇 글자씩 세로로 갈라지지 않는 제목 칸의 최소 폭입니다. */
const MIN_TITLE_WIDTH = 240;

for (const width of WIDTHS) {
  test(`창 폭 ${width}px에서 ID와 제목 열이 가로 스크롤 없이 표 영역 안에 다 보인다`, async () => {
    await page.viewport(width, 900);
    const screen = await render(
      <LocaleProvider locale="ko">
        <DecisionsScreen />
      </LocaleProvider>,
    );

    expect(document.documentElement.scrollWidth, `${width}px 페이지 가로 넘침`).toBe(
      document.documentElement.clientWidth,
    );
    for (const { decision } of DECISIONS) {
      const row = screen.getByRole("link", { name: decision.title }).element().closest("tr")!;
      const area = row.closest("table")!.parentElement!.getBoundingClientRect();
      const titleCell = row.cells[1]!.getBoundingClientRect();
      const where = `${width}px ${decision.id}`;
      expect(titleCell.width, `${where} 제목 칸 폭`).toBeGreaterThanOrEqual(MIN_TITLE_WIDTH);
      expect(titleCell.right, `${where} 제목 칸 오른쪽 끝`).toBeLessThanOrEqual(area.right);
    }
  });
}

/** 열 이름 순서(ID, 제목, 상태, 대체 관계, 날짜)대로 머리 칸의 폭(px)입니다. 제목 열은 남는 폭을 차지하므로 null입니다. */
const COLUMN_WIDTHS = [96, null, 128, 288, 144];

// 창 폭 441px, 768px, 1440px의 표 영역 폭은 377px, 704px, 1376px입니다.
// 표 영역은 좌우 테두리가 1px씩이라, 표가 차지할 수 있는 폭은 영역 폭보다 2px 좁습니다.
for (const [width, tableWidth] of [
  [441, 935],
  [768, 1024],
  [1440, 1374],
] as const) {
  test(`창 폭 ${width}px에서 결정 표의 열 폭과 표 폭은 ${tableWidth}px로 정해진다`, async () => {
    await page.viewport(width, 900);
    const screen = await render(
      <LocaleProvider locale="ko">
        <DecisionsScreen />
      </LocaleProvider>,
    );

    // 유효한 결정 표와 대체된 결정 표를 모두 잽니다.
    const tables = screen.container.querySelectorAll("table");
    expect(tables, "결정 표 수").toHaveLength(2);
    for (const table of tables) {
      expect(table.getBoundingClientRect().width, "표 폭").toBe(tableWidth);
      Array.from(table.tHead!.rows[0]!.cells).forEach((cell, index) => {
        const columnWidth = COLUMN_WIDTHS[index];
        if (columnWidth == null) return;
        expect(cell.getBoundingClientRect().width, `${cell.textContent} 열 폭`).toBe(columnWidth);
      });
    }
  });
}

test("결정 행은 짧은 ID를 복사 단추로 보이고, 대체된 결정의 행은 새 결정 표시와 함께 대체한 결정으로 가는 링크를 보인다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <DecisionsScreen />
    </LocaleProvider>,
  );

  for (const { decision } of DECISIONS) {
    const copyButton = screen.getByRole("button", { name: messages.copyId.labelOf(decision.id) });
    expect(copyButton.element().textContent).toBe(shortIssueId(decision.id));
  }
  const retired = screen.getByRole("row", { name: new RegExp(`이전 ${KOREAN}`) });
  await expect.element(retired).toMatchTextContent(messages.decisions.supersededBy);
  await expect
    .element(retired.getByRole("link", { name: "desk-ko-new", exact: true }))
    .toHaveAttribute("href", "/decisions?issue=desk-ko-new");
});

function decision(id: string, title: string, status: string): Issue {
  return issue(id, {
    title,
    status,
    issueType: "decision",
    createdAt: Date.UTC(2026, 9, 17),
    updatedAt: Date.UTC(2026, 9, 17),
    closedAt: status === "closed" ? Date.UTC(2026, 9, 17) : null,
  });
}
