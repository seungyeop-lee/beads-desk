import type { Issue } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import type { EpicDescendants, EpicSummary } from "@/shared/contract/epics";
import { issue } from "@/shared/domain/issues/issueFixture";
import { graphHref } from "@/client/ui/screens/graph/graphAddress";
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
  useParams: () => ({ workspace: "demo" }),
  usePathname: () => "/w/demo/epics",
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

test("닫힌 에픽 묶음은 처음에 접혀 있고, 묶음을 펼치면 닫힌 에픽 카드가 하위 이슈 목록을 접은 채로 보이며 펼치기 단추로 펼칠 수 있다", async () => {
  reads.epics = [
    { epic: epic("desk-open", "열린 에픽"), totalChildren: 0, closedChildren: 0 },
    CLOSED_EPIC,
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

  await expect.element(screen.getByRole("link", { name: "열린 에픽" })).toBeVisible();
  const closedGroup = screen.getByRole("button", {
    name: messages.epics.toggleGroup(messages.epics.groups.closed, false),
  });
  await expect.element(closedGroup).toHaveAttribute("aria-expanded", "false");
  await expect.element(closedGroup).toHaveTextContent(`${messages.epics.groups.closed}1`);
  await expect.element(screen.getByRole("link", { name: "끝난 에픽" })).not.toBeInTheDocument();

  await closedGroup.click();
  // 닫힌 카드는 진행률 막대 대신 닫은 날짜와 닫힌 하위 이슈 수를 보입니다.
  const card = page.elementLocator(
    screen.getByRole("link", { name: "끝난 에픽" }).element().closest("section")!,
  );
  await expect.element(card.getByText("닫은 날 2026. 10. 20.", { exact: true })).toBeVisible();
  await expect.element(card.getByText("1/1", { exact: true })).toBeVisible();
  await expect.element(card.getByRole("progressbar")).not.toBeInTheDocument();

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

test("접힌 닫힌 묶음의 에픽도 검색하면 보이고, 검색하는 동안 접은 묶음은 검색어를 지우면 검색 전처럼 닫힌 묶음만 접힌 상태로 돌아간다", async () => {
  reads.epics = [
    { epic: epic("desk-open", "열린 에픽"), totalChildren: 0, closedChildren: 0 },
    CLOSED_EPIC,
  ];
  const screen = await renderScreen();
  const search = screen.getByRole("searchbox", { name: messages.epics.search });
  const closedGroup = screen.getByRole("button", {
    name: new RegExp(messages.epics.groups.closed),
  });
  const openGroup = screen.getByRole("button", { name: new RegExp(messages.epics.groups.open) });
  await expect.element(closedGroup).toHaveAttribute("aria-expanded", "false");

  await search.fill("끝난");
  await expect.element(screen.getByRole("link", { name: "끝난 에픽" })).toBeVisible();
  await expect.element(closedGroup).toHaveAttribute("aria-expanded", "true");
  await expect.element(screen.getByRole("link", { name: "열린 에픽" })).not.toBeInTheDocument();
  await expect.element(openGroup).not.toBeInTheDocument();
  const count = screen.getByRole("heading", { level: 1 }).element().nextElementSibling;
  expect(count?.textContent).toBe("1");

  await search.fill("DESK-");
  await closedGroup.click();
  await expect.element(closedGroup).toHaveAttribute("aria-expanded", "false");
  await openGroup.click();
  await expect.element(openGroup).toHaveAttribute("aria-expanded", "false");

  await search.clear();
  await expect.element(openGroup).toHaveAttribute("aria-expanded", "true");
  await expect.element(closedGroup).toHaveAttribute("aria-expanded", "false");
  await expect.element(screen.getByRole("link", { name: "열린 에픽" })).toBeVisible();
  await expect.element(screen.getByRole("link", { name: "끝난 에픽" })).not.toBeInTheDocument();
});

test("하위 에픽 제목으로 검색하면 그 하위 에픽이 속한 카드와 그 사이의 하위 에픽 행을 펼쳐 맞은 행을 보이고, 검색어를 지우면 카드가 다시 접힌다", async () => {
  const middle = issue("desk-a.1", { title: "중간 에픽", issueType: "epic", parent: "desk-a" });
  const deep = issue("desk-a.1.1", { title: "깊은 에픽", issueType: "epic", parent: "desk-a.1" });
  reads.epics = [
    // 우선순위가 가장 높아 처음에 펼쳐지는 에픽입니다.
    {
      epic: issue("desk-first", { title: "먼저 펼친 에픽", issueType: "epic", priority: 1 }),
      totalChildren: 0,
      closedChildren: 0,
    },
    { epic: epic("desk-a", "상위 에픽"), totalChildren: 1, closedChildren: 0 },
    { epic: middle, totalChildren: 1, closedChildren: 0 },
    { epic: deep, totalChildren: 0, closedChildren: 0 },
  ];
  reads.descendants = { "desk-a": { issues: [middle, deep], waiters: {} } };
  const screen = await renderScreen();
  const search = screen.getByRole("searchbox", { name: messages.epics.search });
  const card = screen.getByRole("button", { name: /desk-a 하위 이슈/ });
  await expect.element(card).toHaveAttribute("aria-expanded", "false");

  await search.fill("중간 에픽");
  await expect.element(card).toHaveAttribute("aria-expanded", "true");
  await expect.element(screen.getByRole("row", { name: /중간 에픽/ })).toBeVisible();
  await expect.element(screen.getByRole("row", { name: /깊은 에픽/ })).not.toBeInTheDocument();
  await expect
    .element(screen.getByRole("link", { name: "먼저 펼친 에픽" }))
    .not.toBeInTheDocument();

  // 하위 에픽 아래의 하위 에픽이 맞으면, 하위 목록에서 그 위의 하위 에픽 행도 펼칩니다.
  await search.fill("깊은 에픽");
  await expect.element(screen.getByRole("row", { name: /깊은 에픽/ })).toBeVisible();

  await search.clear();
  await expect.element(card).toHaveAttribute("aria-expanded", "false");
  await expect.element(screen.getByRole("link", { name: "먼저 펼친 에픽" })).toBeVisible();
});

test("검색어에 맞는 에픽이 없으면 빈 상태 문구를 보인다", async () => {
  reads.epics = [{ epic: epic("desk-open", "열린 에픽"), totalChildren: 0, closedChildren: 0 }];
  const screen = await renderScreen();

  await screen.getByRole("searchbox", { name: messages.epics.search }).fill("없는 에픽");
  await expect.element(screen.getByText(messages.epics.noMatches)).toBeVisible();
  await expect.element(screen.getByRole("link", { name: "열린 에픽" })).not.toBeInTheDocument();
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

test("에픽과 하위 이슈의 ID는 짧은 ID 복사 단추이고, 하위 이슈 표는 제목을 고치지 않고 막힌 이슈에 선행 이슈를 보인다", async () => {
  reads.epics = [
    { epic: epic("desk-epic", "묶음 에픽"), totalChildren: 2, closedChildren: 0 },
    { epic: epic("desk-loading", "읽는 중인 에픽"), totalChildren: 1, closedChildren: 0 },
  ];
  reads.descendants = {
    "desk-epic": {
      issues: [
        issue("desk-epic.1", { title: "선행 작업", parent: "desk-epic", dependentCount: 1 }),
        issue("desk-epic.2", {
          title: "기다리는 작업",
          parent: "desk-epic",
          blockedBy: ["desk-epic.1"],
          dependencyCount: 1,
        }),
      ],
      waiters: {},
    },
  };
  const screen = await renderScreen();
  const card = (title: string) =>
    page.elementLocator(screen.getByRole("link", { name: title }).element().closest("section")!);

  for (const id of ["desk-epic", "desk-epic.1", "desk-epic.2"]) {
    const copyButton = screen.getByRole("button", { name: messages.copyId.labelOf(id) });
    expect(copyButton.element().textContent).toBe(shortIssueId(id));
  }
  const waitingRow = screen.getByRole("row", { name: /기다리는 작업/ });
  await expect
    .element(waitingRow.getByRole("link", { name: messages.blocking.waitingOn("desk-epic.1") }))
    .toHaveAttribute("href", "/epics?issue=desk-epic.1");
  // 하위 이슈 표의 행에서 누를 수 있는 단추는 ID 복사뿐입니다.
  expect(waitingRow.getByRole("button").elements()).toHaveLength(1);

  // 처음에는 첫 열린 에픽만 펼치므로, 하위 이슈를 읽는 중인 에픽은 펼쳐서 봅니다.
  const toggle = screen.getByRole("button", {
    name: messages.epics.toggleChildren("desk-loading", false),
  });
  expect(getComputedStyle(toggle.element()).cursor).toBe("pointer");
  await toggle.click();
  const loadingPicker = card("읽는 중인 에픽").getByRole("combobox", {
    name: messages.epics.addExistingChild,
  });
  await expect.element(loadingPicker).toBeDisabled();
  expect(getComputedStyle(loadingPicker.element()).cursor).not.toBe("pointer");
});

test("상위 이슈가 에픽인 에픽은 카드로 보이지 않고, 상위 에픽을 펼친 하위 목록의 그 에픽 행은 의존 수 대신 순서 보기 링크를 보인다", async () => {
  reads.epics = [
    { epic: epic("desk-parent", "상위 에픽"), totalChildren: 2, closedChildren: 0 },
    {
      epic: issue("desk-parent.1", {
        title: "하위 에픽",
        issueType: "epic",
        parent: "desk-parent",
      }),
      totalChildren: 0,
      closedChildren: 0,
    },
    { epic: epic("desk-root", "상위 없는 에픽"), totalChildren: 0, closedChildren: 0 },
    {
      epic: issue("desk-task.1", {
        title: "작업 아래 에픽",
        issueType: "epic",
        parent: "desk-task",
      }),
      totalChildren: 0,
      closedChildren: 0,
    },
  ];
  reads.descendants = {
    "desk-parent": {
      issues: [
        issue("desk-parent.1", { title: "하위 에픽", issueType: "epic", parent: "desk-parent" }),
        issue("desk-parent.2", { title: "하위 작업", parent: "desk-parent", dependencyCount: 1 }),
      ],
      waiters: {},
    },
  };
  const screen = await renderScreen();

  // 에픽 카드마다 머리에 진행률 막대가 하나씩 있습니다.
  const cards = screen
    .getByRole("progressbar")
    .elements()
    .filter((bar) => bar.closest("header"))
    .map((bar) => bar.getAttribute("aria-label"));
  expect(cards).toEqual(
    ["desk-parent", "desk-root", "desk-task.1"].map((id) => messages.epics.progress(id)),
  );
  const count = screen.getByRole("heading", { level: 1 }).element().nextElementSibling;
  expect(count?.textContent).toBe("3");

  const childEpicRow = screen.getByRole("row", { name: /하위 에픽/ });
  await expect
    .element(childEpicRow.getByRole("link", { name: messages.graph.epicOrder }))
    .toHaveAttribute(
      "href",
      `/w/demo${graphHref({ kind: "epic", id: "desk-parent.1" }, "/epics?")}`,
    );
  await expect
    .element(childEpicRow.getByTitle(messages.issueTable.dependencyCounts(0, 0), { exact: true }))
    .not.toBeInTheDocument();
  const taskRow = screen.getByRole("row", { name: /하위 작업/ });
  await expect
    .element(taskRow.getByTitle(messages.issueTable.dependencyCounts(1, 0), { exact: true }))
    .toHaveTextContent("1 / 0");
});

test("펼친 하위 목록의 에픽 행은 하위 수 대신 그 에픽의 직접 하위 이슈 진행률을 보이고, 작업 행은 하위 수를 그대로 보인다", async () => {
  reads.epics = [{ epic: epic("desk-a", "상위 에픽"), totalChildren: 2, closedChildren: 0 }];
  reads.descendants = { "desk-a": { issues: NESTED_EPIC_DESCENDANTS, waiters: {} } };
  const screen = await renderScreen();

  const childEpicRow = screen.getByRole("row", { name: /하위 에픽 B/ });
  await expect
    .element(childEpicRow.getByRole("progressbar", { name: messages.epics.progress("desk-a.1") }))
    .toHaveAttribute("value", "1");
  await expect.element(childEpicRow.getByText("1/3 · 33%", { exact: true })).toBeVisible();
  await expect
    .element(childEpicRow.getByText(messages.issueTable.childCount(3)))
    .not.toBeInTheDocument();
  // 하위 에픽 행의 접기·펼치기 단추는 그대로 남습니다.
  await expect
    .element(
      childEpicRow.getByRole("button", {
        name: messages.issueTable.toggleChildren("desk-a.1", false),
      }),
    )
    .toBeVisible();

  const taskRow = screen.getByRole("row", { name: /하위 작업 C/ });
  await expect.element(taskRow.getByText(messages.issueTable.childCount(1))).toBeVisible();
  await expect.element(taskRow.getByRole("progressbar")).not.toBeInTheDocument();
});

// 455px는 Chrome 110%에서 가장 좁힌 창입니다.
for (const [locale, closedOn] of [
  ["ko", "닫은 날 2026. 10. 20."],
  ["en", "Closed Oct 20, 2026"],
] as const) {
  test(`창 폭 455px에서 닫힌 에픽 카드의 닫은 날짜와 하위 이슈 수가 한 줄로 카드 안에 보인다(${locale})`, async () => {
    reads.epics = [CLOSED_EPIC];
    await page.viewport(455, 900);
    const screen = await render(
      <LocaleProvider locale={locale}>
        <EpicsScreen />
      </LocaleProvider>,
    );
    await screen.getByRole("button", { expanded: false, name: /Closed epics|닫힌 에픽/ }).click();

    for (const text of [closedOn, "1/1"]) {
      const element = screen.getByText(text, { exact: true }).element();
      const card = element.closest("section")!.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      expect(lineCount(element), `${locale} ${text} 줄 수`).toBe(1);
      expect(box.left, `${locale} ${text} 왼쪽 끝`).toBeGreaterThanOrEqual(card.left);
      expect(box.right, `${locale} ${text} 오른쪽 끝`).toBeLessThanOrEqual(card.right);
    }
    expect(document.documentElement.scrollWidth, `${locale} 페이지 가로 넘침`).toBe(
      document.documentElement.clientWidth,
    );
  });
}

// 455px는 Chrome 110%에서 가장 좁힌 창입니다.
for (const locale of ["ko", "en"] as const) {
  test(`창 폭 455px에서 하위 에픽 행의 진행률은 제목 칸 밖으로 넘치지 않는다(${locale})`, async () => {
    reads.epics = [{ epic: epic("desk-a", "상위 에픽"), totalChildren: 2, closedChildren: 0 }];
    reads.descendants = { "desk-a": { issues: NESTED_EPIC_DESCENDANTS, waiters: {} } };
    await page.viewport(455, 900);
    const screen = await render(
      <LocaleProvider locale={locale}>
        <EpicsScreen />
      </LocaleProvider>,
    );

    const count = screen.getByText("1/3 · 33%", { exact: true }).element();
    const cell = count.closest("td")!;
    const cellBox = cell.getBoundingClientRect();
    for (const element of [count, count.previousElementSibling!]) {
      const box = element.getBoundingClientRect();
      expect(box.left, `${locale} ${element.tagName} 왼쪽 끝`).toBeGreaterThanOrEqual(cellBox.left);
      expect(box.right, `${locale} ${element.tagName} 오른쪽 끝`).toBeLessThanOrEqual(
        cellBox.right,
      );
    }
    expect(lineCount(count), `${locale} 진행 개수 줄 수`).toBe(1);
    expect(cell.scrollWidth, `${locale} 제목 칸 가로 넘침`).toBeLessThanOrEqual(cell.clientWidth);
  });
}

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

/**
 * 하위 이슈 1개를 모두 닫은 뒤 UTC 정오에 닫은 에픽입니다.
 * UTC-11부터 UTC+11 사이의 시간대에서는 닫은 날이 2026년 10월 20일로 보입니다.
 */
const CLOSED_EPIC: EpicSummary = {
  epic: issue("desk-done", {
    title: "끝난 에픽",
    issueType: "epic",
    status: "closed",
    closedAt: Date.UTC(2026, 9, 20, 12),
  }),
  totalChildren: 1,
  closedChildren: 1,
};

/** 에픽 A 아래에 하위 이슈 3개 중 1개가 닫힌 에픽 B와, 하위 이슈가 1개인 작업 C가 있습니다. */
const NESTED_EPIC_DESCENDANTS: Issue[] = [
  issue("desk-a.1", {
    title: "하위 에픽 B는 제목이 길어서 좁은 창에서는 제목 칸 안에서 여러 줄로 나뉘어 보입니다",
    issueType: "epic",
    parent: "desk-a",
  }),
  issue("desk-a.1.1", { title: "B의 닫힌 작업", parent: "desk-a.1", status: "closed" }),
  issue("desk-a.1.2", { title: "B의 열린 작업", parent: "desk-a.1" }),
  issue("desk-a.1.3", { title: "B의 진행 중 작업", parent: "desk-a.1", status: "in_progress" }),
  issue("desk-a.2", { title: "하위 작업 C", parent: "desk-a" }),
  issue("desk-a.2.1", { title: "C의 하위 작업", parent: "desk-a.2" }),
];

function epic(id: string, title: string): Issue {
  return issue(id, { title, issueType: "epic" });
}
