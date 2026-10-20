import type { Issue } from "@beads-desk/bd/issue";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import { enMessages } from "@/client/modules/locale/domain/enMessages";
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
  run: (write) => write("demo"),
};

// 순서 보기 링크를 보이는 표는 의존 열이 넓어 표 폭 계산이 달라지므로 따로 검사합니다.
for (const [width, epicOrder] of AREA_WIDTHS.flatMap((width) => [
  [width, false] as const,
  [width, true] as const,
])) {
  test(`표 영역 폭 ${width}px${epicOrder ? "의 순서 보기 링크를 보이는 표" : ""}에서 ID·유형·제목이 가로 스크롤 없이 표 영역 안에 다 보이고, 상태·우선순위 입력은 표 안에서 스크롤하면 영역 안에 다 보인다`, async () => {
    const screen = await render(
      <LocaleProvider locale="ko">
        <div style={{ width }}>
          <IssueTable
            issues={ISSUES}
            issueHref={(id) => `/issues?issue=${id}`}
            writes={WRITES}
            gateTitles={new Map()}
            {...(epicOrder && { epicOrderHref: (id: string) => `/epics?epic=${id}` })}
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

    // 상태와 우선순위 열은 좁은 표 영역에서 가로 스크롤로 봅니다.
    const scroller = screen.container.querySelector("table")!.parentElement!;
    const area = scroller.getBoundingClientRect();
    for (const { id } of ISSUES) {
      for (const name of [messages.issueTable.statusOf(id), messages.issueTable.priorityOf(id)]) {
        const control = screen.getByRole("combobox", { name }).element();
        control.scrollIntoView({ block: "nearest", inline: "nearest" });
        const box = control.getBoundingClientRect();
        expect(box.left, `${width}px ${name} 왼쪽 끝`).toBeGreaterThanOrEqual(area.left);
        expect(box.right, `${width}px ${name} 오른쪽 끝`).toBeLessThanOrEqual(area.right);
      }
    }
  });
}

/** 열 이름 순서(ID, 유형, 제목, 상태, 우선순위, 라벨, 의존)대로 머리 칸의 폭(px)입니다. 제목 열은 남는 폭을 차지하므로 null입니다. */
const COLUMN_WIDTHS = {
  dependencyCount: [96, 104, null, 128, 128, 144, 80],
  epicOrder: [96, 104, null, 128, 128, 144, 112],
};

// 표 영역은 좌우 테두리가 1px씩이라, 표가 차지할 수 있는 폭은 영역 폭보다 2px 좁습니다.
for (const [width, epicOrder, tableWidth] of [
  [377, false, 855],
  [377, true, 887],
  [704, false, 1024],
  [704, true, 1024],
  [1376, false, 1374],
  [1376, true, 1374],
] as const) {
  test(`표 영역 폭 ${width}px${epicOrder ? "의 순서 보기 링크를 보이는 표" : ""}에서 열 폭과 표 폭은 ${tableWidth}px로 정해진다`, async () => {
    const screen = await render(
      <LocaleProvider locale="ko">
        <div style={{ width }}>
          <IssueTable
            issues={ISSUES}
            issueHref={(id) => `/issues?issue=${id}`}
            writes={WRITES}
            gateTitles={new Map()}
            {...(epicOrder && { epicOrderHref: (id: string) => `/epics?epic=${id}` })}
          />
        </div>
      </LocaleProvider>,
    );

    const table = screen.container.querySelector("table")!;
    expect(table.getBoundingClientRect().width, "표 폭").toBe(tableWidth);
    const expected = COLUMN_WIDTHS[epicOrder ? "epicOrder" : "dependencyCount"];
    Array.from(table.tHead!.rows[0]!.cells).forEach((cell, index) => {
      const columnWidth = expected[index];
      // 좁은 표 영역에서 감춘 유형 열은 폭을 재지 않습니다.
      if (columnWidth == null || !cell.checkVisibility()) return;
      expect(cell.getBoundingClientRect().width, `${cell.textContent} 열 폭`).toBe(columnWidth);
    });
  });
}

// 서버는 검색어 앞을 8자만 남겨 발췌를 자릅니다(server/modules/issueSearch/domain/issueTextSearch.ts).
const COMMENT_EXCERPT =
  "…리뷰에서 여백을 정했고 픽셀 단위로 맞추며, 버튼과 입력 칸 사이 간격은 8픽셀로 통일하고 아이콘 버튼은 예외로 둔다…";
const SEARCH_TERM = "픽셀";

for (const width of [AREA_WIDTHS[0]!, AREA_WIDTHS.at(-1)!]) {
  test(`표 영역 폭 ${width}px에서 본문·댓글 검색으로 맞은 행에만 제목 아래에 맞은 필드와 발췌가 보이고, 발췌의 검색어는 굵고 진한 글자로 제목 칸 안에서 잘리지 않으며, 발췌는 한 줄을 넘지 않는다`, async () => {
    const screen = await render(
      <LocaleProvider locale="ko">
        <div style={{ width }}>
          <IssueTable
            issues={[
              issue("desk-hit", { title: "댓글로 찾은 작업" }),
              issue("desk-title", { title: "제목으로 찾은 작업" }),
            ]}
            issueHref={(id) => `/issues?issue=${id}`}
            writes={WRITES}
            gateTitles={new Map()}
            searchHits={
              new Map([
                [
                  "desk-hit",
                  [
                    { field: "comment", excerpt: COMMENT_EXCERPT },
                    { field: "notes", excerpt: "메모에 남긴 픽셀 기준" },
                  ],
                ],
              ])
            }
            searchTerm={SEARCH_TERM}
          />
        </div>
      </LocaleProvider>,
    );
    const hitRow = screen.getByRole("row", { name: /댓글로 찾은 작업/ });
    const titleRow = screen.getByRole("row", { name: /제목으로 찾은 작업/ });

    await expect
      .element(hitRow.getByText(messages.issues.commentHit, { exact: true }))
      .toBeVisible();
    await expect
      .element(hitRow.getByText(messages.issue.bodyFields.notes, { exact: true }))
      .toBeVisible();
    await expect.element(hitRow.getByText("메모에 남긴 픽셀 기준", { exact: true })).toBeVisible();
    expect(titleRow.element().textContent).not.toContain(SEARCH_TERM);

    const excerpt = hitRow.getByText(COMMENT_EXCERPT, { exact: true }).element();
    const titleCell = excerpt.closest("td")!;
    const excerptBox = excerpt.getBoundingClientRect();
    expect(excerptBox.right, "발췌 오른쪽 끝").toBeLessThanOrEqual(
      titleCell.getBoundingClientRect().right,
    );
    expect(excerptBox.height, "발췌 높이").toBeLessThanOrEqual(
      parseFloat(getComputedStyle(excerpt).lineHeight),
    );

    // 발췌는 한 줄로 보이고 넘치는 끝은 말줄임으로 잘리므로, 검색어 글자가 보이는 발췌 영역 안에 있는지 잽니다.
    const marks = Array.from(excerpt.querySelectorAll("mark"));
    expect(marks.map((mark) => mark.textContent)).toEqual([SEARCH_TERM, SEARCH_TERM]);
    expect(marks[0]!.getBoundingClientRect().right, "검색어 오른쪽 끝").toBeLessThanOrEqual(
      excerptBox.right,
    );
    // 발췌 줄은 흐린 글자라, 검색어는 굵기와 함께 제목 칸의 흐리지 않은 글자색으로 구분됩니다.
    const markStyle = getComputedStyle(marks[0]!);
    expect(markStyle.fontWeight).toBe("600");
    expect(markStyle.color).toBe(getComputedStyle(titleCell).color);
    expect(markStyle.color).not.toBe(getComputedStyle(excerpt).color);
    expect(markStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)");
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

test("human gate에 막힌 행의 gate 링크는 막힌 이슈의 상세를 gate 응답 칸 주소로 열고, 제목과 gate가 아닌 막힘 링크는 영역 없이 연다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssueTable
        issues={[
          issue("desk-gated", { title: "gate에 막힌 작업", blockedBy: ["desk-gate"] }),
          issue("desk-blocked", { title: "선행 작업에 막힌 작업", blockedBy: ["desk-prior"] }),
          issue("desk-prior", { title: "선행 작업" }),
        ]}
        issueHref={(id, section) => `/issues?issue=${id}${section ? `&section=${section}` : ""}`}
        writes={WRITES}
        gateTitles={new Map([["desk-gate", { title: "법무 검토", humanGate: true }]])}
      />
    </LocaleProvider>,
  );

  const href = (name: string) => screen.getByRole("link", { name, exact: true }).element();
  await expect
    .element(href(messages.humanGate.waitingOn("법무 검토")))
    .toHaveAttribute("href", "/issues?issue=desk-gated&section=human-gate");
  expect(href("gate에 막힌 작업").getAttribute("href")).toBe("/issues?issue=desk-gated");
  expect(href(messages.blocking.waitingOn("desk-prior")).getAttribute("href")).toBe(
    "/issues?issue=desk-prior",
  );
});

test("기다리는 이슈가 있는 행에만 제목 옆에 대기 수가 붙는다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssueTable
        issues={[
          issue("desk-bottleneck", { title: "병목 작업" }),
          issue("desk-plain", { title: "평범한 작업" }),
        ]}
        issueHref={(id) => `/issues?issue=${id}`}
        writes={WRITES}
        gateTitles={new Map()}
        waiters={new Map([["desk-bottleneck", 2]])}
      />
    </LocaleProvider>,
  );

  const rowText = (title: RegExp) => screen.getByRole("row", { name: title }).element().textContent;
  expect(rowText(/병목 작업/)).toContain(messages.issue.waiters(2));
  expect(rowText(/평범한 작업/)).not.toMatch(/\d+개 대기/);
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

test("epicOrderHref를 주지 않으면 에픽 행도 의존 칸에 의존 수를 보인다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssueTable
        issues={[
          issue("desk-epic", { title: "목록의 에픽", issueType: "epic", dependentCount: 2 }),
        ]}
        issueHref={(id) => `/issues?issue=${id}`}
        writes={WRITES}
        gateTitles={new Map()}
      />
    </LocaleProvider>,
  );
  const row = screen.getByRole("row", { name: /목록의 에픽/ });

  await expect
    .element(row.getByTitle(messages.issueTable.dependencyCounts(0, 2), { exact: true }))
    .toHaveTextContent("0 / 2");
  await expect
    .element(row.getByRole("link", { name: messages.graph.epicOrder }))
    .not.toBeInTheDocument();
});

test("epicProgress를 주지 않으면 tree의 에픽 행도 제목 옆에 하위 수를 보이고 진행률 막대를 보이지 않는다", async () => {
  const screen = await render(
    <LocaleProvider locale="ko">
      <IssueTable
        tree={[
          {
            issue: issue("desk-epic", { title: "목록의 에픽", issueType: "epic" }),
            depth: 0,
            childCount: 2,
          },
          { issue: issue("desk-epic.1", { parent: "desk-epic" }), depth: 1, childCount: 0 },
          { issue: issue("desk-epic.2", { parent: "desk-epic" }), depth: 1, childCount: 0 },
        ]}
        issueHref={(id) => `/issues?issue=${id}`}
        writes={WRITES}
        gateTitles={new Map()}
      />
    </LocaleProvider>,
  );
  const row = screen.getByRole("row", { name: /목록의 에픽/ });

  await expect.element(row.getByText(messages.issueTable.childCount(2))).toBeVisible();
  await expect.element(row.getByRole("progressbar")).not.toBeInTheDocument();
});

for (const locale of ["ko", "en"] as const) {
  test(`epicOrderHref를 주면 에픽 행만 의존 칸에 순서 보기 링크를 칸 밖으로 넘치지 않게 보인다(${locale})`, async () => {
    const localeMessages = locale === "ko" ? messages : enMessages;
    const screen = await render(
      <LocaleProvider locale={locale}>
        <div style={{ width: 1376 }}>
          <IssueTable
            issues={[
              issue("desk-epic", { title: "하위 에픽", issueType: "epic", dependencyCount: 1 }),
              issue("desk-task", { title: "하위 작업", dependencyCount: 1 }),
            ]}
            issueHref={(id) => `/epics?issue=${id}`}
            writes={WRITES}
            gateTitles={new Map()}
            epicOrderHref={(id) => `/epics?epic=${id}`}
          />
        </div>
      </LocaleProvider>,
    );
    const epicRow = screen.getByRole("row", { name: /하위 에픽/ });
    const taskRow = screen.getByRole("row", { name: /하위 작업/ });

    const link = epicRow.getByRole("link", { name: localeMessages.graph.epicOrder });
    await expect.element(link).toHaveAttribute("href", "/epics?epic=desk-epic");
    // 링크도 다른 칸처럼 칸의 좌우 여백 안에 놓여, 표 오른쪽 끝에 붙지 않아야 합니다.
    const cellElement = link.element().closest("td")!;
    const cell = cellElement.getBoundingClientRect();
    const style = getComputedStyle(cellElement);
    const box = link.element().getBoundingClientRect();
    const table = cellElement.closest("table")!.getBoundingClientRect();
    expect(parseFloat(style.paddingRight), "칸 오른쪽 여백").toBeGreaterThan(0);
    expect(box.left, "링크 왼쪽 끝").toBeGreaterThanOrEqual(
      cell.left + parseFloat(style.paddingLeft),
    );
    expect(box.right, "링크 오른쪽 끝").toBeLessThanOrEqual(
      cell.right - parseFloat(style.paddingRight),
    );
    expect(table.right - box.right, "링크와 표 오른쪽 끝 사이 여백").toBeGreaterThan(0);

    await expect
      .element(taskRow.getByRole("link", { name: localeMessages.graph.epicOrder }))
      .not.toBeInTheDocument();
    await expect
      .element(
        taskRow.getByTitle(localeMessages.issueTable.dependencyCounts(1, 0), { exact: true }),
      )
      .toHaveTextContent("1 / 0");
  });
}
