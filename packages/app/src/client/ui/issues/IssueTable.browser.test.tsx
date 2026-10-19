import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { issue } from "@/shared/domain/issues/issueFixture";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { LabelEditor } from "./detail/LabelEditor";
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
    labels: ["frontend"],
    blockedBy: ["desk-blocker"],
    dependencyCount: 1,
  }),
  issue("desk-en", {
    title:
      "Issues keep a long English title readable while status, priority, and labels stay reachable",
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
            labels: ["frontend"],
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
  // 제목과 라벨은 단추나 입력 칸이 아닌 글자로 보입니다.
  expect(row.getByRole("button").elements()).toEqual([copyButton.element()]);
  expect(row.getByRole("textbox").elements()).toHaveLength(0);
  await expect.element(row.getByRole("cell", { name: "frontend", exact: true })).toBeVisible();
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

/** 라벨 열은 담당자 열이 쓰던 칸이라 표의 여섯째 칸(DOM 순서)입니다. */
const LABEL_CELL = 5;

function labelCell(screen: Awaited<ReturnType<typeof render>>, title: string) {
  return screen.getByRole("link", { name: title, exact: true }).element().closest("tr")!.cells[
    LABEL_CELL
  ]!;
}

test("라벨 열은 human을 뺀 첫 라벨과 나머지 수(+N)를 보이고, 보일 라벨이 없으면 없음을 보인다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssueTable
        issues={[
          issue("desk-none", { title: "라벨 없음" }),
          issue("desk-one", { title: "라벨 하나", labels: ["frontend"] }),
          issue("desk-three", { title: "라벨 셋", labels: ["frontend", "backend", "api"] }),
          issue("desk-human", { title: "human만", labels: ["human"] }),
          issue("desk-human-mix", { title: "human과 둘", labels: ["human", "backend", "api"] }),
        ]}
        issueHref={(id) => `/issues?issue=${id}`}
        writes={WRITES}
        gateTitles={new Map()}
      />
    </LocaleProvider>,
  );

  const header = labelCell(screen, "라벨 없음").closest("table")!.tHead!.rows[0]!;
  expect(header.cells[LABEL_CELL]!.textContent).toBe(messages.issue.labels);
  expect(header.textContent).not.toContain(messages.issue.assignee);
  const shown = (title: string) => labelCell(screen, title).textContent;
  expect(shown("라벨 없음")).toBe(messages.common.none);
  expect(shown("라벨 하나")).toBe("frontend");
  expect(shown("라벨 셋")).toBe("frontend+2");
  expect(shown("human만")).toBe(messages.common.none);
  expect(shown("human과 둘")).toBe("backend+1");
  // 칸에 마우스를 올리면 human을 뺀 모든 라벨 이름이 보입니다.
  expect(labelCell(screen, "라벨 셋").title).toBe("frontend, backend, api");
  expect(labelCell(screen, "human과 둘").title).toBe("backend, api");
});

test("라벨 열의 칩은 상세 라벨 편집기의 칩보다 낮고 글자도 작다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssueTable
        issues={[issue("desk-one", { title: "라벨 하나", labels: ["frontend"] })]}
        issueHref={(id) => `/issues?issue=${id}`}
        writes={WRITES}
        gateTitles={new Map()}
      />
      <section aria-label="상세">
        <LabelEditor
          labels={["frontend"]}
          disabled={false}
          onAdd={async () => true}
          onRemove={() => {}}
        />
      </section>
    </LocaleProvider>,
  );

  const tableChip = page.elementLocator(labelCell(screen, "라벨 하나")).getByText("frontend", {
    exact: true,
  });
  const detailChip = screen.getByRole("region", { name: "상세" }).getByRole("listitem").element();
  const fontSize = (element: Element) => parseFloat(getComputedStyle(element).fontSize);
  expect(tableChip.element().getBoundingClientRect().height).toBeLessThan(
    detailChip.getBoundingClientRect().height,
  );
  expect(fontSize(tableChip.element())).toBeLessThan(fontSize(detailChip));
});

test("9rem 라벨 칸에 긴 라벨 이름과 +N이 함께 있으면 라벨 이름만 말줄임으로 줄고 +N은 칸 안에 보인다", async () => {
  const longLabel = "customer-onboarding-experience-improvements";
  const screen = await render(
    <LocaleProvider locale="ko">
      <div style={{ width: 1376 }}>
        <IssueTable
          issues={[issue("desk-long", { title: "긴 라벨", labels: [longLabel, "api", "ux"] })]}
          issueHref={(id) => `/issues?issue=${id}`}
          writes={WRITES}
          gateTitles={new Map()}
        />
      </div>
    </LocaleProvider>,
  );

  const cellElement = labelCell(screen, "긴 라벨");
  const cell = page.elementLocator(cellElement);
  const style = getComputedStyle(cellElement);
  const box = cellElement.getBoundingClientRect();
  const contentLeft = box.left + parseFloat(style.paddingLeft);
  const contentRight = box.right - parseFloat(style.paddingRight);
  const chip = cell.getByText(longLabel, { exact: true }).element();
  const more = cell.getByText("+2", { exact: true });

  await expect.element(more).toBeVisible();
  for (const element of [chip, more.element()]) {
    const rect = element.getBoundingClientRect();
    expect(rect.left, `${element.textContent} 왼쪽 끝`).toBeGreaterThanOrEqual(contentLeft);
    expect(rect.right, `${element.textContent} 오른쪽 끝`).toBeLessThanOrEqual(contentRight);
  }
  // 라벨 이름은 칸에 다 들어가지 않으므로 잘려 보입니다.
  expect(chip.scrollWidth).toBeGreaterThan(chip.clientWidth);
});
