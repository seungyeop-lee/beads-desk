import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { issue } from "@/shared/domain/issues/issueFixture";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { IssueTable } from "./IssueTable";

/** 이슈 화면은 좌우 여백이 2rem씩이므로, e2e가 쓰던 창 폭(441~1440px)에서 64px을 뺀 폭이 표 영역의 폭입니다. */
const AREA_WIDTHS = [377, 390, 416, 436, 704, 960, 1376];
/** 제목이 몇 글자씩 세로로 갈라지지 않는 제목 칸의 최소 폭입니다. */
const MIN_TITLE_WIDTH = 240;

const ISSUES: Issue[] = [
  issue("desk-ko", {
    title:
      "이슈를 작업 상태로 나눠 보이는 곳은 모두 같은 기준을 쓰고, 기준에는 bd 저장 상태와 의존 관계와 human 라벨을 씁니다",
    issueType: "feature",
    assignee: "minji",
    blockedBy: ["desk-blocker"],
    dependencyCount: 1,
  }),
  issue("desk-en", {
    title:
      "Issues keep a long English title readable while status, priority, and assignee stay reachable",
  }),
  issue("desk-blocker", { title: "막는 작업", issueType: "bug", dependentCount: 1 }),
];

const WRITES: IssueWrites = {
  pending: false,
  error: null,
  dismissError: () => {},
  run: (write) => write(),
};

for (const width of AREA_WIDTHS) {
  test(`표 영역 폭 ${width}px에서 ID·유형·제목이 가로 스크롤 없이 표 영역 안에 다 보인다`, async () => {
    const screen = await render(
      <LocaleProvider locale="ko">
        <div style={{ width }}>
          <IssueTable
            issues={ISSUES}
            issueHref={(id) => `/issues?issue=${id}`}
            writes={WRITES}
            gateTitles={new Map()}
          />
        </div>
      </LocaleProvider>,
    );

    for (const { id, title, issueType } of ISSUES) {
      const rowElement = screen.getByRole("link", { name: title }).element().closest("tr")!;
      const row = page.elementLocator(rowElement);
      const area = rowElement.closest("table")!.parentElement!.getBoundingClientRect();
      const where = `${width}px ${id}`;

      // 좁은 표 영역에서는 유형 칸을 감추므로, 감춘 칸도 세는 DOM 순서로 제목 칸을 찾습니다.
      const titleCell = rowElement.cells[2]!.getBoundingClientRect();
      expect(titleCell.width, `${where} 제목 칸 폭`).toBeGreaterThanOrEqual(MIN_TITLE_WIDTH);
      expect(titleCell.right, `${where} 제목 칸 오른쪽 끝`).toBeLessThanOrEqual(area.right);

      // 유형은 넓은 표에서는 유형 칸에, 좁은 표에서는 제목 앞에 보이고 다른 쪽은 감춥니다.
      const typeLabel = (messages.issue.types as Record<string, string>)[issueType]!;
      const visibleType = row
        .getByText(typeLabel)
        .elements()
        .find((element) => element.checkVisibility());
      for (const element of [
        row.getByRole("button", { name: messages.copyId.labelOf(id) }).element(),
        visibleType!,
      ]) {
        const box = element.getBoundingClientRect();
        expect(box.left, `${where} ${element.textContent} 왼쪽 끝`).toBeGreaterThanOrEqual(
          area.left,
        );
        expect(box.right, `${where} ${element.textContent} 오른쪽 끝`).toBeLessThanOrEqual(
          area.right,
        );
      }
    }
  });
}

test("행은 짧은 ID를 복사 단추로 보이고, 표에서는 상태와 우선순위만 고치며, 의존 칸은 선행·후속 개수를 이름으로 알려 준다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssueTable
        issues={[
          issue("desk-row", {
            title: "표에서 볼 작업",
            assignee: "minji",
            dependencyCount: 1,
            dependentCount: 0,
          }),
        ]}
        issueHref={(id) => `/issues?issue=${id}`}
        writes={WRITES}
        gateTitles={new Map()}
      />
    </LocaleProvider>,
  );
  const row = screen.getByRole("row", { name: /표에서 볼 작업/ });

  const copyButton = row.getByRole("button", { name: messages.copyId.labelOf("desk-row") });
  expect(copyButton.element().textContent).toBe(shortIssueId("desk-row"));
  // 제목과 담당자는 단추나 입력 칸이 아닌 글자로 보입니다.
  expect(row.getByRole("button").elements()).toEqual([copyButton.element()]);
  expect(row.getByRole("textbox").elements()).toHaveLength(0);
  await expect.element(row.getByRole("cell", { name: "minji", exact: true })).toBeVisible();
  const title = row.getByRole("link", { name: "표에서 볼 작업", exact: true });
  await expect.element(title).toHaveAttribute("href", "/issues?issue=desk-row");
  expect(getComputedStyle(title.element()).cursor).toBe("pointer");
  await expect
    .element(row.getByRole("combobox", { name: messages.issueTable.statusOf("desk-row") }))
    .toBeEnabled();
  await expect
    .element(row.getByRole("combobox", { name: messages.issueTable.priorityOf("desk-row") }))
    .toBeEnabled();
  await expect
    .element(row.getByTitle(messages.issueTable.dependencyCounts(1, 0), { exact: true }))
    .toBeVisible();
});

test("판단을 기다리는 이슈의 행에만 판단 기다림 표시가 붙는다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssueTable
        issues={[
          issue("desk-question", { title: "판단이 필요한 작업", labels: ["human"] }),
          issue("desk-plain", { title: "평범한 작업" }),
        ]}
        issueHref={(id) => `/issues?issue=${id}`}
        writes={WRITES}
        gateTitles={new Map()}
      />
    </LocaleProvider>,
  );

  const chip = (title: RegExp) =>
    screen
      .getByRole("row", { name: title })
      .getByText(messages.humanDecision.chip, { exact: true });
  await expect.element(chip(/판단이 필요한 작업/)).toBeVisible();
  await expect.element(chip(/평범한 작업/)).not.toBeInTheDocument();
});
