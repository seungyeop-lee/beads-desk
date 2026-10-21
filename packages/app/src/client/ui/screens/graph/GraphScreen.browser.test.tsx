import { expect, test, vi } from "vitest";
import { type Locator, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { VIEWPORT_MARGIN } from "@/client/modules/graph/domain/graphViewport";
import { shortIssueId } from "@/client/modules/issues/domain/issueId";
import { contrast, srgb } from "@/client/ui/designSystem/colorContrast.testkit";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import type { GraphData } from "@/shared/contract/graph";
import { issue } from "@/shared/domain/issues/issueFixture.testkit";
import { GraphScreen } from "./GraphScreen";
import { reactFlowDom } from "./reactFlowDom.testkit";

let graph: GraphData = { issues: [], dependencies: [], ancestorEpics: {} };
let address = new URLSearchParams();
let detailShown = false;

// 화면이 서버에서 읽는 그래프 데이터와 주소, 상세 dialog를 여는 부분은 고정 값으로 바꿉니다.
// 상세는 detailShown일 때만 그래프 옆에 놓이는 빈 영역으로 그려, 그래프와 상세의 배치만 확인합니다.
vi.mock("@/client/modules/graph/application/useGraph", () => ({
  useGraph: () => ({ data: graph, error: null, loading: false }),
}));
vi.mock("@/client/ui/issues/IssueDetailRoute", async () => ({
  ...(await import("@/client/ui/address/screenAddressMocks.testkit")).issueDetailRouteMock(
    "/graph",
  ),
  IssueDetailRoute: () =>
    detailShown ? <section aria-label="상세 자리" className="h-96 w-full shrink-0" /> : null,
}));
vi.mock("next/navigation", async () =>
  (await import("@/client/ui/address/screenAddressMocks.testkit")).nextNavigationMock({
    screenPath: "/graph",
    search: () => address,
  }),
);

async function renderGraph(scope: "epic" | "center", id: string, data: GraphData) {
  graph = data;
  address = new URLSearchParams({ [scope]: id });
  const screen = await render(
    <LocaleProvider locale="ko">
      <GraphScreen />
    </LocaleProvider>,
  );
  // dialog는 작게 줄인 상태에서 커지며 열리므로, 좌표를 재기 전에 열림 효과가 끝나기를 기다립니다.
  const box = screen.getByRole("dialog").element().querySelector<HTMLElement>(".modal-box")!;
  await expect
    .poll(() => Math.abs(box.getBoundingClientRect().width - box.offsetWidth))
    .toBeLessThan(1);
  return screen;
}

const LONG_TITLE = "도움말 툴팁이 화면 안에 보이는지 확인하려고 제목을 길게 늘인";

// 480px에서는 header가 설명의 최대 폭(32rem)보다 좁습니다.
for (const width of [768, 480])
  for (const [scope, id, help] of [
    ["epic", "help-epic", /^에픽에 속한 이슈를 blocks 관계를 따라/],
    ["center", "help-center", /^이 이슈의 앞뒤 blocks 사슬은/],
  ] as const)
    test(`창 폭 ${width}px의 ${scope} 그래프에서 제목이 길어도 도움말은 마우스를 올리거나 키보드 초점을 두면 화면 안에 모두 보인다`, async () => {
      await page.viewport(width, 800);
      const screen = await renderGraph(
        scope,
        id,
        graphData(
          {
            "help-epic": { title: `${LONG_TITLE} 에픽`, issueType: "epic" },
            "help-first": { title: "도움말 선행", parent: "help-epic" },
            "help-center": { title: `${LONG_TITLE} 가운데 이슈`, parent: "help-epic" },
          },
          [["help-center", "help-first"]],
        ),
      );
      const button = screen.getByRole("button", { name: help });
      const tooltip = screen.getByText(help);
      await expect.element(tooltip).not.toBeVisible();

      await userEvent.hover(button);
      await expectInsideViewport(tooltip.element(), width, 800);

      await userEvent.unhover(button);
      await expect.element(tooltip).not.toBeVisible();
      (
        screen.getByRole("heading", { level: 1 }).getByRole("link").element() as HTMLElement
      ).focus();
      await userEvent.tab();
      await expect.element(button).toHaveFocus();
      await expectInsideViewport(tooltip.element(), width, 800);
    });

async function expectInsideViewport(tooltip: Element, width: number, height: number) {
  await expect.poll(() => getComputedStyle(tooltip).visibility).toBe("visible");
  const box = tooltip.getBoundingClientRect();
  expect(box.left).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(width);
  expect(box.bottom).toBeLessThanOrEqual(height);
}

const SKIP_TITLES = {
  "skip-a": "건너뛰기 처음",
  "skip-b":
    "건너뛰기 가운데 A long English title changes this node height without hiding the dependency edges that skip it and connect to later stages",
  "skip-c":
    "건너뛰기 마지막 긴 한국어 제목이 여러 줄로 늘어나도 다른 노드와 간선이 겹치지 않고 모든 글자를 끝까지 표시합니다",
  "skip-d": "건너뛰기 다음",
};
const SKIP_EDGES = [
  ["skip-a", "skip-b"],
  ["skip-a", "skip-c"],
  ["skip-b", "skip-c"],
  ["skip-a", "skip-d"],
  ["skip-c", "skip-d"],
] as const;

for (const [scope, id] of [
  ["epic", "skip-epic"],
  ["center", "skip-a"],
] as const)
  test(`${scope} 그래프에서 한 열 이상을 건너뛰는 간선도 가운데 열의 노드 밑을 지나지 않아, 모든 간선이 끝까지 보인다`, async () => {
    await page.viewport(1440, 900);
    const screen = await renderGraph(
      scope,
      id,
      graphData(
        {
          "skip-epic": { title: "건너뛰기 에픽", issueType: "epic" },
          ...Object.fromEntries(
            Object.entries(SKIP_TITLES).map(([key, title]) => [
              key,
              { title, parent: "skip-epic" },
            ]),
          ),
        },
        SKIP_EDGES.map(([from, to]) => [to, from]),
      ),
    );
    const canvas = screen.getByRole("region", { name: "의존 그래프" });
    for (const [from, to] of SKIP_EDGES)
      await expect
        .element(canvas.getByRole("img", { name: `${from} 다음에 ${to}` }))
        .toBeInTheDocument();
    await expect
      .element(canvas.getByRole("link", { name: new RegExp(SKIP_TITLES["skip-d"]) }))
      .toBeVisible();
    expect(await coveredEdges(screen, SKIP_EDGES.length)).toEqual([]);
  });

test("이슈 중심 그래프의 gate·관련·발견 간선도 양 끝이 아닌 노드 밑을 지나지 않는다", async () => {
  await page.viewport(1440, 900);
  const screen = await renderGraph("center", "look-center", ALL_EDGES);
  expect(await coveredEdges(screen, 8)).toEqual([]);
});

// 에픽 밖의 사람 판단 gate와 PR gate가 에픽의 작업을 막는 에픽 계획입니다.
const GATE_EPIC = graphData(
  {
    "gate-epic": { title: "gate 에픽", issueType: "epic" },
    "gate-first": { title: "gate 앞 작업", parent: "gate-epic" },
    "gate-work": { title: "gate를 기다리는 작업", parent: "gate-epic" },
    "gate-next": { title: "gate 뒤 작업", parent: "gate-epic" },
    "gate-human": { title: "사람 판단", issueType: "gate", awaitType: "human" },
    "gate-pr": { title: "PR 대기", issueType: "gate", awaitType: "gh:pr" },
  },
  [
    ["gate-work", "gate-first"],
    ["gate-next", "gate-work"],
    ["gate-work", "gate-human"],
    ["gate-work", "gate-pr"],
    ["gate-next", "gate-pr"],
  ],
);

test("에픽 계획 그래프의 gate 간선도 양 끝이 아닌 노드 밑을 지나지 않는다", async () => {
  await page.viewport(1440, 900);
  const screen = await renderGraph("epic", "gate-epic", GATE_EPIC);
  expect(await coveredEdges(screen, 5)).toEqual([]);
});

test("에픽 계획 그래프는 에픽 밖 gate 카드에 에픽 밖 표시를 붙이고, gate 간선을 실행 순서로 읽으며, 범례에 사람 판단 gate 설명을 보인다", async () => {
  const screen = await renderGraph("epic", "gate-epic", GATE_EPIC);
  const canvas = screen.getByRole("region", { name: "의존 그래프" });
  for (const [from, to] of [
    ["gate-human", "gate-work"],
    ["gate-pr", "gate-work"],
    ["gate-pr", "gate-next"],
  ])
    await expect
      .element(canvas.getByRole("img", { name: `${from} 다음에 ${to}`, exact: true }))
      .toBeInTheDocument();
  for (const title of ["사람 판단", "PR 대기"])
    await expect.poll(() => cardText(canvas, title)).toContain("에픽 밖");
  expect(cardText(canvas, "gate를 기다리는 작업")).not.toContain("에픽 밖");
  await expect
    .element(
      screen.getByLabelText("관계 범례").getByRole("button", { name: /^사람이 판단해 응답해야/ }),
    )
    .toBeInTheDocument();
});

/** 그래프 노드의 카드입니다. 링크는 카드 위에 겹친 빈 요소라, 카드에 보이는 글자와 흐림은 링크를 감싼 카드에서 확인합니다. */
function cardOf(container: Locator, title: string) {
  return page.elementLocator(
    container.getByRole("link", { name: new RegExp(title) }).element().parentElement!,
  );
}

/** 카드에 보이는 글자입니다. 부를 때마다 카드를 다시 찾으므로 expect.poll에 넘길 수 있습니다. */
function cardText(container: Locator, title: string) {
  return cardOf(container, title).element().textContent;
}

/**
 * 캔버스에 그린 간선 가운데 양 끝이 아닌 노드 밑으로 지나 가려지는 간선과 그 노드입니다. count개의 간선이 그려질 때까지 기다립니다.
 * 간선 id는 blocks이면 "from->to", 관련·발견이면 "관계:from->to"입니다.
 */
async function coveredEdges(screen: Awaited<ReturnType<typeof renderGraph>>, count: number) {
  const canvas = screen.getByRole("region", { name: "의존 그래프" }).element();
  await expect.poll(() => canvas.querySelectorAll("path[data-edge]").length).toBe(count);
  const boxes = [...canvas.querySelectorAll<HTMLElement>(reactFlowDom.node)].map((node) => ({
    id: node.dataset.id!,
    box: node.getBoundingClientRect(),
  }));
  return [...canvas.querySelectorAll<SVGGElement>(reactFlowDom.edge)].flatMap((edge) => {
    const [from, to] = edge.dataset.id!.replace(/^[^:]*:/, "").split("->");
    const points = pathPoints(edge.querySelector<SVGPathElement>("path[data-edge]")!);
    const covering = boxes
      .filter(({ id }) => id !== from && id !== to)
      .filter(({ box }) => points.some((point) => inside(point, box)))
      .map(({ id }) => id);
    return covering.length > 0 ? [{ edge: edge.dataset.id, covering }] : [];
  });
}

/** 간선 선을 따라 일정 간격으로 고른 점을 화면 좌표로 돌려줍니다. */
function pathPoints(path: SVGPathElement) {
  const matrix = path.getScreenCTM()!;
  const length = path.getTotalLength();
  return Array.from({ length: 101 }, (_, at) =>
    path.getPointAtLength((length * at) / 100).matrixTransform(matrix),
  );
}

const inside = ({ x, y }: { x: number; y: number }, box: DOMRect) =>
  x > box.left && x < box.right && y > box.top && y < box.bottom;

test("4단계 에픽은 선후 관계 없음 목록을 접고 읽을 수 있는 크기의 노드를 중앙에 보이며, 펼친 목록은 320px 폭으로 보인다", async () => {
  await page.viewport(1440, 900);
  const screen = await renderGraph(
    "epic",
    "panel-epic",
    graphData(
      {
        "panel-epic": { title: "패널 공간 확인", issueType: "epic" },
        "panel-1": { title: "패널 첫 단계", parent: "panel-epic" },
        "panel-2": { title: "패널 둘째 단계", parent: "panel-epic" },
        "panel-3": { title: "패널 셋째 단계", parent: "panel-epic" },
        "panel-4": { title: "패널 넷째 단계", parent: "panel-epic" },
        "panel-alone": { title: "패널 독립 작업", parent: "panel-epic" },
      },
      [
        ["panel-2", "panel-1"],
        ["panel-3", "panel-2"],
        ["panel-4", "panel-3"],
      ],
    ),
  );
  const canvas = screen.getByRole("region", { name: "의존 그래프" });
  const panel = screen.getByRole("region", { name: "선후 관계 없음" });
  const expand = panel.getByRole("button", { name: "선후 관계 없는 이슈 목록 펼치기" });
  await expect.element(expand).toHaveAttribute("aria-expanded", "false");
  const nodes = canvas.getByRole("link", { name: /패널 .*단계/ });
  await expect.poll(() => nodes.elements().length).toBe(4);

  // 목록을 접은 뒤 그래프 영역이 넓어지면 보기를 다시 중앙에 맞추므로, 노드 좌표가 자리를 잡을 때까지 기다립니다.
  await expect
    .poll(() => {
      const canvasBox = canvas.element().getBoundingClientRect();
      const boxes = nodes.elements().map((node) => node.getBoundingClientRect());
      const left = Math.min(...boxes.map((box) => box.left));
      const right = Math.max(...boxes.map((box) => box.right));
      return Math.abs((left + right) / 2 - (canvasBox.left + canvasBox.width / 2));
    })
    .toBeLessThan(0.5);
  const canvasBox = canvas.element().getBoundingClientRect();
  for (const node of nodes.elements()) {
    const box = node.getBoundingClientRect();
    expect(box.left).toBeGreaterThanOrEqual(canvasBox.left);
    expect(box.right).toBeLessThanOrEqual(canvasBox.right);
    expect(box.width).toBeGreaterThanOrEqual(280 * 0.75);
    expect(box.width).toBeLessThanOrEqual(280 * 1.25);
  }

  await expand.click();
  await expect.element(panel.getByRole("link", { name: /패널 독립 작업/ })).toBeVisible();
  expect(getComputedStyle(panel.element()).width).toBe("320px");
});

/** 그래프를 끌어 옮겨 기준 위치를 화면 밖으로 보낸 뒤 확대해, 첫 화면과 다른 위치와 배율을 만듭니다. */
async function moveAwayAndZoomIn(screen: Awaited<ReturnType<typeof renderGraph>>) {
  const canvas = screen.getByRole("region", { name: "의존 그래프" });
  const viewport = canvas.element().querySelector<HTMLElement>(reactFlowDom.viewport)!;
  const before = viewport.style.transform;
  await dragCanvas(screen);
  await canvas.getByRole("button", { name: "확대" }).click();
  await expect.poll(() => viewport.style.transform).not.toBe(before);
}

/** 캔버스 왼쪽 위의 빈 곳을 오른쪽 아래로 끌어 그래프를 옮깁니다. */
async function dragCanvas(screen: Awaited<ReturnType<typeof renderGraph>>) {
  const canvas = screen.getByRole("region", { name: "의존 그래프" });
  await userEvent.dragAndDrop(canvas, canvas, {
    sourcePosition: { x: 20, y: 20 },
    targetPosition: { x: 620, y: 420 },
  });
}

/** 그래프 viewport의 배율입니다. React Flow는 viewport를 translate 뒤 scale로 옮깁니다. */
function graphZoom(screen: Awaited<ReturnType<typeof renderGraph>>) {
  const viewport = screen
    .getByRole("region", { name: "의존 그래프" })
    .element()
    .querySelector<HTMLElement>(reactFlowDom.viewport)!;
  return Number(/scale\(([^)]+)\)/.exec(viewport.style.transform)![1]);
}

test("선행·후속 보기에서 화면을 옮긴 뒤 기준 이슈로 이동 단추를 누르면, 배율은 그대로이고 기준 이슈 노드의 중심이 그래프 영역 중앙에 온다", async () => {
  await page.viewport(1440, 900);
  const screen = await renderGraph(
    "center",
    "focus-center",
    graphData(
      {
        "focus-before": { title: "이동 선행" },
        "focus-center": { title: "이동 기준" },
        "focus-after": { title: "이동 후속" },
      },
      [
        ["focus-center", "focus-before"],
        ["focus-after", "focus-center"],
      ],
    ),
  );
  const flow = screen.getByRole("region", { name: "의존 그래프" }).element();
  const node = () => flow.querySelector(reactFlowDom.nodeOf("focus-center"))!;
  await expect.poll(() => node()).toBeTruthy();
  await moveAwayAndZoomIn(screen);
  const zoom = graphZoom(screen);
  const distance = () => {
    const pane = flow.querySelector(reactFlowDom.pane)!.getBoundingClientRect();
    const box = node().getBoundingClientRect();
    return Math.hypot(
      box.left + box.width / 2 - (pane.left + pane.width / 2),
      box.top + box.height / 2 - (pane.top + pane.height / 2),
    );
  };
  expect(distance()).toBeGreaterThan(100);

  await screen.getByRole("button", { name: "배율을 유지하고 기준 이슈로 이동" }).click();
  await expect.poll(distance).toBeLessThan(0.5);
  expect(graphZoom(screen)).toBe(zoom);
});

test("순서 보기에서 화면을 옮긴 뒤 진행 중 단계로 이동 단추를 누르면, 배율은 그대로이고 진행 중 단계 이름이 그래프 영역 위쪽 가운데에 온다", async () => {
  await page.viewport(1440, 900);
  const screen = await renderGraph(
    "epic",
    "focus-epic",
    graphData(
      {
        "focus-epic": { title: "이동 에픽", issueType: "epic" },
        "focus-1": { title: "이동 첫 단계", parent: "focus-epic", status: "closed" },
        "focus-2": { title: "이동 둘째 단계", parent: "focus-epic" },
        "focus-3": { title: "이동 셋째 단계", parent: "focus-epic" },
      },
      [
        ["focus-2", "focus-1"],
        ["focus-3", "focus-2"],
      ],
    ),
  );
  const flow = screen.getByRole("region", { name: "의존 그래프" });
  const label = flow.getByText("2단계 · 진행 중", { exact: true });
  await expect.element(label).toBeInTheDocument();
  await moveAwayAndZoomIn(screen);
  const zoom = graphZoom(screen);
  // 단계 이름의 가로 중심은 그래프 영역 가운데에, 윗변은 위쪽 여백 아래에 와야 합니다.
  const distance = () => {
    const pane = flow.element().querySelector(reactFlowDom.pane)!.getBoundingClientRect();
    const box = label.element().getBoundingClientRect();
    return Math.hypot(
      box.left + box.width / 2 - (pane.left + pane.width / 2),
      box.top - (pane.top + VIEWPORT_MARGIN),
    );
  };
  expect(distance()).toBeGreaterThan(100);

  await screen.getByRole("button", { name: "배율을 유지하고 진행 중 단계로 이동" }).click();
  await expect.poll(distance).toBeLessThan(0.5);
  expect(graphZoom(screen)).toBe(zoom);
});

test("캔버스를 끌어 옮긴 뒤 이슈 갱신으로 선후 관계 없음 패널이 나타나 그래프 영역이 좁아져도, 옮긴 위치와 배율을 유지한다", async () => {
  await page.viewport(1440, 900);
  const issues: Record<string, IssueSeed> = {
    "keep-epic": { title: "갱신 중 위치 유지", issueType: "epic" },
    "keep-1": { title: "위치 유지 먼저", parent: "keep-epic" },
    "keep-2": { title: "위치 유지 다음", parent: "keep-epic" },
  };
  const blocks = [["keep-2", "keep-1"]] as const;
  const screen = await renderGraph("epic", "keep-epic", graphData(issues, [...blocks]));
  const canvas = screen.getByRole("region", { name: "의존 그래프" });
  const flow = canvas.element().querySelector<HTMLElement>(reactFlowDom.pane)!;
  const viewport = flow.querySelector<HTMLElement>(reactFlowDom.viewport)!;
  await expect.element(canvas.getByRole("link", { name: /위치 유지 다음/ })).toBeVisible();
  const initial = viewport.style.transform;
  await dragCanvas(screen);
  await expect.poll(() => viewport.style.transform).not.toBe(initial);
  const moved = viewport.style.transform;
  const width = flow.clientWidth;

  graph = graphData(
    { ...issues, "keep-alone": { title: "갱신으로 나타난 독립 작업", parent: "keep-epic" } },
    [...blocks],
  );
  await screen.rerender(
    <LocaleProvider locale="ko">
      <GraphScreen />
    </LocaleProvider>,
  );
  await expect
    .element(
      screen
        .getByRole("region", { name: "선후 관계 없음" })
        .getByRole("link", { name: /갱신으로 나타난 독립 작업/ }),
    )
    .toBeVisible();
  await expect.poll(() => flow.clientWidth).toBeLessThan(width);
  // 그래프 영역의 크기 변화는 ResizeObserver가 다음 frame 전에 알리므로, 그 처리가 끝난 뒤의 위치를 읽습니다.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  expect(viewport.style.transform).toBe(moved);
});

test("패널을 펼쳐도 들어가는 짧은 에픽은 목록을 펼쳐 시작한다", async () => {
  await page.viewport(1440, 900);
  const screen = await renderGraph(
    "epic",
    "short-epic",
    graphData(
      {
        "short-epic": { title: "짧은 순서", issueType: "epic" },
        "short-1": { title: "짧은 첫 단계", parent: "short-epic" },
        "short-2": { title: "짧은 둘째 단계", parent: "short-epic" },
        "short-alone": { title: "짧은 독립 작업", parent: "short-epic" },
      },
      [["short-2", "short-1"]],
    ),
  );
  const panel = screen.getByRole("region", { name: "선후 관계 없음" });
  await expect
    .element(panel.getByRole("button", { name: "선후 관계 없는 이슈 목록 접기" }))
    .toHaveAttribute("aria-expanded", "true");
  await expect.element(panel.getByRole("link", { name: /짧은 독립 작업/ })).toBeVisible();
  expect(getComputedStyle(panel.element()).width).toBe("320px");
});

test("선후 관계 없는 이슈가 없는 에픽은 패널과 패널 조작을 보이지 않는다", async () => {
  const screen = await renderGraph(
    "epic",
    "linked-epic",
    graphData(
      {
        "linked-epic": { title: "독립 작업 없음", issueType: "epic" },
        "linked-1": { title: "연결 첫 단계", parent: "linked-epic" },
        "linked-2": { title: "연결 둘째 단계", parent: "linked-epic" },
      },
      [["linked-2", "linked-1"]],
    ),
  );
  await expect
    .element(
      screen
        .getByRole("region", { name: "의존 그래프" })
        .getByRole("link", { name: /연결 둘째 단계/ }),
    )
    .toBeVisible();
  expect(screen.getByRole("region", { name: "선후 관계 없음" }).elements()).toHaveLength(0);
  expect(screen.getByRole("button", { name: /선후 관계 없는 이슈 목록/ }).elements()).toHaveLength(
    0,
  );
});

test("키보드로 펼친 선후 관계 없음 목록은 이슈를 다시 읽어도, 그래프 안에 상세를 열었다 닫아도 펼친 채로 남는다", async () => {
  await page.viewport(1440, 900);
  // 4단계 에픽은 이 창 폭에서 목록을 접은 채로 시작합니다.
  const issues: Record<string, IssueSeed> = {
    "kept-epic": { title: "펼침 유지", issueType: "epic" },
    "kept-1": { title: "펼침 첫 단계", parent: "kept-epic" },
    "kept-2": { title: "펼침 둘째 단계", parent: "kept-epic" },
    "kept-3": { title: "펼침 셋째 단계", parent: "kept-epic" },
    "kept-4": { title: "펼침 넷째 단계", parent: "kept-epic" },
    "kept-alone": { title: "펼침 독립 작업", parent: "kept-epic" },
  };
  const blocks = [
    ["kept-2", "kept-1"],
    ["kept-3", "kept-2"],
    ["kept-4", "kept-3"],
  ] as const;
  const screen = await renderGraph("epic", "kept-epic", graphData(issues, [...blocks]));
  const rerender = () =>
    screen.rerender(
      <LocaleProvider locale="ko">
        <GraphScreen />
      </LocaleProvider>,
    );
  const panel = screen.getByRole("region", { name: "선후 관계 없음" });
  const expand = panel.getByRole("button", { name: "선후 관계 없는 이슈 목록 펼치기" });
  const collapse = panel.getByRole("button", { name: "선후 관계 없는 이슈 목록 접기" });
  // 목록을 새로 그리면 펼친 채로 시작했다가 그래프 배치를 잰 뒤에 접으므로, 노드가 그려지고 그 처리가 끝난 뒤에 읽습니다.
  const expectStillExpanded = async () => {
    await expect
      .element(
        screen
          .getByRole("region", { name: "의존 그래프" })
          .getByRole("link", { name: /펼침 넷째 단계/ }),
      )
      .toBeVisible();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    expect(collapse.element().getAttribute("aria-expanded")).toBe("true");
  };
  await expect.element(expand).toHaveAttribute("aria-expanded", "false");

  (expand.element() as HTMLElement).focus();
  await userEvent.keyboard("{Enter}");
  await expect.element(collapse).toHaveAttribute("aria-expanded", "true");

  graph = graphData(
    { ...issues, "kept-alone": { title: "다시 읽은 독립 작업", parent: "kept-epic" } },
    [...blocks],
  );
  await rerender();
  await expect.element(panel.getByRole("link", { name: /다시 읽은 독립 작업/ })).toBeVisible();
  await expectStillExpanded();

  detailShown = true;
  try {
    address = new URLSearchParams({ epic: "kept-epic", issue: "kept-alone" });
    await rerender();
    await expect.element(screen.getByRole("region", { name: "상세 자리" })).toBeVisible();
    await expectStillExpanded();
  } finally {
    detailShown = false;
  }
  address = new URLSearchParams({ epic: "kept-epic" });
  await rerender();
  await expect.element(screen.getByRole("region", { name: "상세 자리" })).not.toBeInTheDocument();
  await expectStillExpanded();
});

// 간선 종류(blocks, gate, human gate, 관련, 발견)와 해소된 관계가 모두 들어 있는 이슈 중심 그래프입니다.
const ALL_EDGES = graphData(
  {
    "look-center": { title: "간선 기준" },
    "look-before": { title: "열린 선행" },
    "look-done": { title: "닫힌 선행", status: "closed" },
    "look-human": { title: "사람 gate", issueType: "gate", awaitType: "human" },
    "look-human-done": {
      title: "닫힌 사람 gate",
      issueType: "gate",
      awaitType: "human",
      status: "closed",
    },
    "look-pr": { title: "PR gate", issueType: "gate", awaitType: "gh:pr" },
    "look-timer": {
      title: "닫힌 timer gate",
      issueType: "gate",
      awaitType: "timer",
      status: "closed",
    },
    "look-note": { title: "관련 메모" },
    "look-found": { title: "발견한 이슈" },
  },
  [
    ["look-center", "look-before"],
    ["look-center", "look-done"],
    ["look-center", "look-human"],
    ["look-center", "look-human-done"],
    ["look-center", "look-pr"],
    ["look-center", "look-timer"],
  ],
  [
    ["look-center", "look-note", "related"],
    ["look-found", "look-center", "discovered-from"],
  ],
);

/** 그래프에 그린 간선의 선입니다. 범례 샘플은 캔버스 밖에 있으므로 들어가지 않습니다. */
async function renderedEdges(screen: Awaited<ReturnType<typeof renderGraph>>, count: number) {
  const canvas = screen.getByRole("region", { name: "의존 그래프" }).element();
  await expect.poll(() => canvas.querySelectorAll("path[data-edge]").length).toBe(count);
  return [...canvas.querySelectorAll<SVGPathElement>("path[data-edge]")];
}

/** 선이 marker-end로 가리키는 화살촉 path입니다. 화살촉이 없으면 null입니다. */
function arrowOf(line: Element): SVGPathElement | null {
  const id = /#([^"')]+)/.exec(getComputedStyle(line).markerEnd)?.[1];
  return id ? document.getElementById(id)!.querySelector("path") : null;
}

/** 화살촉의 색입니다. 속이 찬 화살촉은 fill, 속이 빈 화살촉은 테두리(stroke)가 색입니다. */
function arrowColor(arrow: SVGPathElement): string {
  const style = getComputedStyle(arrow);
  return style.stroke === "none" ? style.fill : style.stroke;
}

/** 선의 모양입니다. 범례 샘플과 실제 간선을 비교하는 데 씁니다. */
function lineLook(line: Element) {
  const style = getComputedStyle(line);
  const arrow = arrowOf(line);
  return {
    stroke: style.stroke,
    width: style.strokeWidth,
    dash: style.strokeDasharray,
    linecap: style.strokeLinecap,
    arrow: arrow && {
      color: arrowColor(arrow),
      shape: arrow.getAttribute("d"),
      fill: getComputedStyle(arrow).fill,
    },
  };
}

/** HSL 채도(0~1)입니다. 회색이면 0입니다. */
function saturation(color: string): number {
  const channels = srgb(color).map((value) => value / 255);
  const [max, min] = [Math.max(...channels), Math.min(...channels)];
  const lightness = (max + min) / 2;
  return max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
}

test("간선 종류마다 화살촉은 선과 같은 색이고, 관련 간선에는 화살촉이 없다", async () => {
  const screen = await renderGraph("center", "look-center", ALL_EDGES);
  const lines = await renderedEdges(screen, 8);
  expect(new Set(lines.map((line) => line.dataset.edge))).toEqual(
    new Set(["blocks", "gate", "humanGate", "related", "discovered"]),
  );
  const arrow = (line: Element) => {
    const path = arrowOf(line);
    return path && arrowColor(path);
  };
  expect(lines.map((line) => [line.dataset.edge, arrow(line)])).toEqual(
    lines.map((line) => [
      line.dataset.edge,
      line.dataset.edge === "related" ? null : getComputedStyle(line).stroke,
    ]),
  );
  const discovered = lines.find((line) => line.dataset.edge === "discovered")!;
  expect(getComputedStyle(arrowOf(discovered)!).fill, "발견 화살촉은 속이 비어 있다").not.toBe(
    getComputedStyle(discovered).stroke,
  );
});

test("범례는 그래프에 그린 간선 종류만 그 순서대로 보이고, 샘플의 선과 화살촉은 같은 종류의 실제 간선과 같다", async () => {
  const screen = await renderGraph("center", "look-center", ALL_EDGES);
  const lines = await renderedEdges(screen, 8);
  const legend = screen.getByLabelText("관계 범례").element();
  const samples = [...legend.querySelectorAll("svg[data-edge] path")];
  expect(samples.map((sample) => sample.closest("svg")!.dataset.edge)).toEqual([
    "blocks",
    "gate",
    "humanGate",
    "related",
    "discovered",
  ]);
  for (const sample of samples) {
    const kind = sample.closest("svg")!.dataset.edge;
    const actual = lines.filter((line) => line.dataset.edge === kind).map(lineLook);
    expect(actual, `${kind} 범례 샘플`).toContainEqual(lineLook(sample));
  }
  expect(
    [...legend.querySelectorAll("svg[data-edge]")].map((svg) => svg.parentElement!.innerText),
  ).toEqual(["선행 → 후속", "gate 대기", "사람 판단 대기", "관련", "발견"]);
});

const LEGEND_HELP = [
  /^앞 이슈가 끝나야 뒤 이슈를 시작할 수 있습니다/,
  /^작업이 timer, GitHub 실행·PR, 다른 이슈 같은 조건을 기다립니다/,
  /^사람이 판단해 응답해야 열리는 gate입니다/,
  /^함께 보면 좋은 이슈입니다\..*기준 이슈에 직접 연결된 관계만 표시합니다/,
  /^작업하다가 발견한 이슈를 향합니다\..*기준 이슈에 직접 연결된 관계만 표시합니다/,
];

test("범례 항목의 ? 아이콘에 마우스를 올리면 그 항목의 설명이 화면 안에 보이고 벗어나면 숨겨지며, 보조 관계 설명 줄은 따로 두지 않는다", async () => {
  await page.viewport(1024, 800);
  const screen = await renderGraph("center", "look-center", ALL_EDGES);
  await renderedEdges(screen, 8);
  for (const help of LEGEND_HELP) {
    const button = screen.getByRole("button", { name: help });
    const tooltip = screen.getByText(help);
    await expect.poll(() => getComputedStyle(tooltip.element()).visibility).toBe("hidden");
    await userEvent.hover(button);
    await expectInsideViewport(tooltip.element(), 1024, 800);
    await userEvent.unhover(button);
    await expect.poll(() => getComputedStyle(tooltip.element()).visibility).toBe("hidden");
  }
  expect(screen.getByText(/관련·발견 관계만 함께 표시합니다/).elements()).toHaveLength(0);
});

test("범례 항목의 ? 아이콘에 키보드 초점을 두면 그 항목의 설명이 보인다", async () => {
  const screen = await renderGraph("center", "look-center", ALL_EDGES);
  await renderedEdges(screen, 8);
  const button = screen.getByRole("button", { name: LEGEND_HELP[2]! });
  (screen.getByRole("heading", { level: 1 }).getByRole("link").element() as HTMLElement).focus();
  for (let step = 0; step < 10 && document.activeElement !== button.element(); step++)
    await userEvent.tab();
  await expect.element(button).toHaveFocus();
  await expectInsideViewport(screen.getByText(LEGEND_HELP[2]!).element(), 1440, 900);
});

for (const theme of ["desk", "desk-dark"])
  test(`${theme} 테마에서 사람 판단 gate 선은 열림·닫힘 모두 회색 잉크 선과 달리 채도가 높은 보라색이다`, async () => {
    document.documentElement.dataset.theme = theme;
    try {
      const screen = await renderGraph("center", "look-center", ALL_EDGES);
      const lines = await renderedEdges(screen, 8);
      const saturations = (kind: string) =>
        lines
          .filter((line) => line.dataset.edge === kind)
          .map((line) => saturation(getComputedStyle(line).stroke));
      const human = saturations("humanGate");
      expect(human).toHaveLength(2);
      for (const ink of [...saturations("blocks"), ...saturations("gate")])
        expect(ink).toBeLessThan(0.1);
      for (const value of human) expect(value).toBeGreaterThan(0.3);
    } finally {
      delete document.documentElement.dataset.theme;
    }
  });

test("에픽 순서 보기의 범례는 그린 blocks 간선 항목만 보인다", async () => {
  const screen = await renderGraph(
    "epic",
    "legend-epic",
    graphData(
      {
        "legend-epic": { title: "범례 에픽", issueType: "epic" },
        "legend-1": { title: "범례 첫 단계", parent: "legend-epic" },
        "legend-2": { title: "범례 둘째 단계", parent: "legend-epic" },
      },
      [["legend-2", "legend-1"]],
    ),
  );
  await renderedEdges(screen, 1);
  const legend = screen.getByLabelText("관계 범례").element();
  expect(
    [...legend.querySelectorAll("svg[data-edge]")].map((svg) => svg.getAttribute("data-edge")),
  ).toEqual(["blocks"]);
});

for (const theme of ["desk", "desk-dark"])
  test(`${theme} 테마에서 모든 간선과 화살촉의 색은 캔버스 바탕과 3:1 이상 대비된다`, async () => {
    document.documentElement.dataset.theme = theme;
    try {
      const screen = await renderGraph("center", "look-center", ALL_EDGES);
      const lines = await renderedEdges(screen, 8);
      const background = getComputedStyle(
        screen.getByRole("region", { name: "의존 그래프" }).element(),
      ).backgroundColor;
      for (const line of lines) {
        const colors = [getComputedStyle(line).stroke];
        const arrow = arrowOf(line);
        if (arrow) colors.push(arrowColor(arrow));
        for (const color of colors)
          expect(
            contrast(color, background),
            `${line.dataset.edge} ${color}`,
          ).toBeGreaterThanOrEqual(3);
      }
    } finally {
      delete document.documentElement.dataset.theme;
    }
  });

test("닫힌 카드와 에픽 밖 카드는 흐리게 하지 않고, 닫힌 카드는 제목 글자만 흐리게 그린다", async () => {
  const screen = await renderGraph(
    "epic",
    "card-epic",
    graphData(
      {
        "card-epic": { title: "카드 에픽", issueType: "epic" },
        "card-done": { title: "닫힌 카드", parent: "card-epic", status: "closed" },
        "card-open": { title: "열린 카드", parent: "card-epic" },
        "card-outside": { title: "에픽 밖 카드" },
      },
      [
        ["card-open", "card-done"],
        ["card-open", "card-outside"],
      ],
    ),
  );
  const canvas = screen.getByRole("region", { name: "의존 그래프" });
  const card = (title: string) => cardOf(canvas, title);
  await expect.element(card("에픽 밖 카드")).toBeVisible();
  expect(
    ["닫힌 카드", "에픽 밖 카드"].map((title) => getComputedStyle(card(title).element()).opacity),
  ).toEqual(["1", "1"]);
  const titleColor = (title: string) =>
    getComputedStyle(card(title).getByText(title, { exact: true }).element()).color;
  expect(titleColor("닫힌 카드")).not.toBe(titleColor("열린 카드"));
  expect(titleColor("에픽 밖 카드")).toBe(titleColor("열린 카드"));
});

test("캔버스를 끌어 옮기거나 확대하면 미니맵의 보이는 영역 표시도 바뀐다", async () => {
  await page.viewport(1440, 900);
  const screen = await renderGraph(
    "center",
    "mini-after",
    graphData({ "mini-before": { title: "미니맵 먼저" }, "mini-after": { title: "미니맵 나중" } }, [
      ["mini-after", "mini-before"],
    ]),
  );
  const canvas = screen.getByRole("region", { name: "의존 그래프" });
  // 미니맵은 보이지 않는 영역을 덮는 path의 구멍으로 지금 보이는 영역을 나타냅니다.
  const mask = () =>
    canvas
      .getByRole("img", { name: "그래프 미니맵" })
      .element()
      .querySelector(reactFlowDom.minimapMask)
      ?.getAttribute("d");
  await expect.poll(mask).toBeTruthy();
  const first = mask();

  await dragCanvas(screen);
  await expect.poll(mask).not.toBe(first);
  const moved = mask();
  await canvas.getByRole("button", { name: "확대", exact: true }).click();
  await expect.poll(mask).not.toBe(moved);
});

const CHAIN_KEYS = Array.from({ length: 10 }, (_, index) => `chain-${index + 1}`);
// 닫힌 작업 10개가 한 줄로 이어진 에픽입니다.
const LONG_CHAIN = graphData(
  {
    "chain-epic": { title: "미니맵 긴 사슬", issueType: "epic" },
    ...Object.fromEntries(
      CHAIN_KEYS.map((key, index) => [
        key,
        { title: `미니맵 작업 ${index + 1}`, status: "closed", parent: "chain-epic" },
      ]),
    ),
  },
  CHAIN_KEYS.slice(1).map((key, index) => [key, CHAIN_KEYS[index]!]),
);

for (const theme of ["desk", "desk-dark"])
  test(`${theme} 테마에서 긴 사슬을 열면 기준 이슈가 첫 화면에 보이고, 미니맵은 기준 이슈 노드만 강조하며, 기준을 바꾸거나 에픽 보기로 열어도 상태 색은 그대로다`, async () => {
    document.documentElement.dataset.theme = theme;
    try {
      await page.viewport(1440, 900);
      const lastScreen = await renderGraph("center", "chain-10", LONG_CHAIN);
      await expectNodeInsideCanvas(lastScreen, "chain-10");
      const last = await minimapNodes(lastScreen);
      await lastScreen.unmount();
      const [lastCenter, ...lastOthers] = last.toSorted(
        (a, b) => Number(b.center) - Number(a.center),
      );
      expect(last.filter(({ center }) => center)).toHaveLength(1);
      expect(lastCenter!.x).toBe(Math.max(...last.map(({ x }) => x)));
      expect(lastCenter!.vectorEffect).toBe("non-scaling-stroke");
      expect(lastOthers.filter(({ stroke }) => stroke === lastCenter!.stroke)).toEqual([]);
      const fills = new Set(last.map(({ fill }) => fill));
      expect(fills.size).toBe(1);

      const firstScreen = await renderGraph("center", "chain-1", LONG_CHAIN);
      const first = await minimapNodes(firstScreen);
      await firstScreen.unmount();
      const firstCenter = first.filter(({ center }) => center);
      expect(firstCenter).toHaveLength(1);
      expect(firstCenter[0]!.x).toBe(Math.min(...first.map(({ x }) => x)));
      expect(firstCenter[0]!.stroke).toBe(lastCenter!.stroke);
      expect(new Set(first.map(({ fill }) => fill))).toEqual(fills);

      const epic = await minimapNodes(await renderGraph("epic", "chain-epic", LONG_CHAIN));
      expect(epic.filter(({ center }) => center)).toEqual([]);
      const strokes = new Set(epic.map(({ stroke }) => stroke));
      expect(strokes.size).toBe(1);
      expect(strokes.has(lastCenter!.stroke)).toBe(false);
      expect(new Set(epic.map(({ fill }) => fill))).toEqual(fills);
    } finally {
      delete document.documentElement.dataset.theme;
    }
  });

/** 미니맵 노드 10개가 그려질 때까지 기다린 뒤, 노드마다 위치와 칠한 색, 기준 이슈 강조 여부를 읽습니다. */
async function minimapNodes(screen: Awaited<ReturnType<typeof renderGraph>>) {
  const minimap = screen.getByRole("img", { name: "그래프 미니맵" }).element();
  await expect.poll(() => minimap.querySelectorAll(reactFlowDom.minimapNode).length).toBe(10);
  return [...minimap.querySelectorAll(reactFlowDom.minimapNode)].map((node) => ({
    x: Number(node.getAttribute("x")),
    fill: getComputedStyle(node).fill,
    stroke: getComputedStyle(node).stroke,
    center: node.classList.contains("minimap-center"),
    vectorEffect: getComputedStyle(node).vectorEffect,
  }));
}

/** 노드가 캔버스 안에 모두 보일 때까지 기다립니다. 첫 화면의 viewport는 캔버스 크기가 정해진 뒤에 다시 맞춰집니다. */
async function expectNodeInsideCanvas(screen: Awaited<ReturnType<typeof renderGraph>>, id: string) {
  const canvas = screen.getByRole("region", { name: "의존 그래프" }).element();
  await expect
    .poll(() => {
      const node = canvas.querySelector(reactFlowDom.nodeOf(id));
      if (!node) return false;
      const [box, bounds] = [node, canvas].map((it) => it.getBoundingClientRect());
      return (
        box!.left >= bounds!.left &&
        box!.right <= bounds!.right &&
        box!.top >= bounds!.top &&
        box!.bottom <= bounds!.bottom
      );
    })
    .toBe(true);
}

const CYCLE = graphData(
  {
    "cycle-epic": { title: "합성 순환 EPIC", issueType: "epic" },
    "cycle-a": {
      title:
        "합성 순환 A 높이가 달라지는 긴 한국어 제목도 다른 노드와 간선을 가리지 않고 마지막 글자까지 끝까지 표시하는지 확인합니다",
      parent: "cycle-epic",
    },
    "cycle-b": {
      title:
        "합성 순환 B A long English title should wrap onto more than two lines while all cycle edges remain visible and avoid the neighboring nodes",
      parent: "cycle-epic",
    },
    "cycle-c": { title: "합성 순환 C", parent: "cycle-epic" },
  },
  [
    ["cycle-b", "cycle-a"],
    ["cycle-c", "cycle-b"],
    ["cycle-a", "cycle-c"],
  ],
);

for (const [scope, id] of [
  ["epic", "cycle-epic"],
  ["center", "cycle-a"],
] as const)
  test(`${scope} 그래프의 blocks 순환은 한 열에 두고, 순환 간선은 다른 노드를 피하면서 캔버스 안에 그린다`, async () => {
    await page.viewport(1440, 900);
    const screen = await renderGraph(scope, id, CYCLE);
    expect(await coveredEdges(screen, 3)).toEqual([]);
    const canvas = screen.getByRole("region", { name: "의존 그래프" }).element();
    const nodes = [...canvas.querySelectorAll<HTMLElement>(reactFlowDom.node)];
    expect(nodes).toHaveLength(3);
    expect(new Set(nodes.map((node) => node.getBoundingClientRect().x)).size).toBe(1);
    const bounds = canvas.getBoundingClientRect();
    const clipped = [...canvas.querySelectorAll<SVGPathElement>("path[data-edge]")].filter((path) =>
      pathPoints(path).some(
        ({ x, y }) => x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom,
      ),
    );
    expect(clipped).toEqual([]);
  });

test("에픽 그래프의 blocks 순환은 경고를 보이고 순환하는 이슈를 한 단계로 센다", async () => {
  const screen = await renderGraph("epic", "cycle-epic", CYCLE);
  await expect
    .element(screen.getByRole("alert").getByText(/blocks 관계가 순환/))
    .toBeInTheDocument();
  await expect.element(screen.getByText("1단계 · 진행 중", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("전체 1단계 중 1단계 진행 중")).toBeVisible();
});

test("gate를 기다리는 작업을 기준으로 열면 공유 gate·복수 gate·gate의 선행 조건 간선을 대기 조건으로 읽는다", async () => {
  await page.viewport(1440, 1000);
  const screen = await renderGraph(
    "center",
    "cond-work",
    graphData(
      {
        "cond-before": { title: "조건 선행 작업" },
        "cond-work": { title: "여러 조건을 기다리는 작업" },
        "cond-after": { title: "공유 조건을 기다리는 후속" },
        "cond-note": { title: "차단하지 않는 관련 메모" },
        "cond-shared": { title: "공통 대기 조건", issueType: "gate", awaitType: "human" },
        "cond-second": { title: "두 번째 대기 조건", issueType: "gate", awaitType: "human" },
        "cond-gate-before": {
          title: "gate 자체의 선행 조건",
          issueType: "gate",
          awaitType: "human",
        },
      },
      [
        ["cond-work", "cond-before"],
        ["cond-after", "cond-work"],
        ["cond-work", "cond-shared"],
        ["cond-after", "cond-shared"],
        ["cond-shared", "cond-before"],
        ["cond-work", "cond-second"],
        ["cond-second", "cond-gate-before"],
      ],
      [["cond-work", "cond-note", "related"]],
    ),
  );
  const lines = await renderedEdges(screen, 8);
  const canvas = screen.getByRole("region", { name: "의존 그래프" });
  for (const [from, to] of [
    ["cond-shared", "cond-work"],
    ["cond-shared", "cond-after"],
    ["cond-second", "cond-work"],
    ["cond-gate-before", "cond-second"],
    ["cond-before", "cond-shared"],
  ])
    await expect
      .element(
        canvas.getByRole("img", { name: `${to}의 선행 조건: ${from} (blocks)`, exact: true }),
      )
      .toBeInTheDocument();
  for (const [from, to] of [
    ["cond-before", "cond-work"],
    ["cond-work", "cond-after"],
  ])
    await expect
      .element(canvas.getByRole("img", { name: `${from} 다음에 ${to}`, exact: true }))
      .toBeInTheDocument();
  expect(lines.map((line) => line.dataset.edge).toSorted()).toEqual([
    "blocks",
    "blocks",
    "humanGate",
    "humanGate",
    "humanGate",
    "humanGate",
    "humanGate",
    "related",
  ]);
  expect(await coveredEdges(screen, 8)).toEqual([]);
});

test("좁은 창에서 그래프 안에 연 상세는 그래프 아래에 놓인다", async () => {
  await page.viewport(390, 844);
  detailShown = true;
  try {
    const screen = await renderGraph(
      "center",
      "narrow-after",
      graphData(
        { "narrow-before": { title: "좁은 창 선행" }, "narrow-after": { title: "좁은 창 후속" } },
        [["narrow-after", "narrow-before"]],
      ),
    );
    const canvas = screen.getByRole("region", { name: "의존 그래프" }).element();
    const detail = screen.getByRole("region", { name: "상세 자리" }).element();
    expect(detail.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      canvas.getBoundingClientRect().bottom,
    );
  } finally {
    detailShown = false;
  }
});

test("관계가 없는 이슈를 기준으로 열면 캔버스 대신 빈 상태 안내를 보인다", async () => {
  const screen = await renderGraph(
    "center",
    "alone",
    graphData({ alone: { title: "관계 없는 이슈" } }, []),
  );
  await expect
    .element(
      screen.getByText("이 이슈와 blocks·related·discovered-from 관계로 이어진 이슈가 없습니다."),
    )
    .toBeVisible();
  expect(screen.getByRole("region", { name: "의존 그래프" }).elements()).toHaveLength(0);
});

test("복귀 정보 없이 연 그래프에서 출발 화면으로 돌아가는 링크는 머리글의 닫기 하나뿐이다", async () => {
  const screen = await renderGraph(
    "center",
    "back-center",
    graphData({ "back-before": { title: "복귀 선행" }, "back-center": { title: "복귀 기준" } }, [
      ["back-center", "back-before"],
    ]),
  );
  await expect
    .element(
      screen.getByRole("region", { name: "의존 그래프" }).getByRole("link", { name: /복귀 선행/ }),
    )
    .toBeVisible();

  const back = "/w/demo/issues?issue=back-center";
  expect(
    screen
      .getByRole("dialog")
      .getByRole("link")
      .elements()
      .filter((link) => link.getAttribute("href") === back)
      .map((link) => link.getAttribute("aria-label")),
  ).toEqual(["닫기"]);
});

test("이슈 중심 보기는 기준 이슈 노드만 강조하고, 관련·양방향 발견 간선을 blocks 사슬과 구분해 방향대로 읽는다", async () => {
  const screen = await renderGraph(
    "center",
    "aux-center",
    graphData(
      {
        "aux-before": { title: "주 사슬 선행" },
        "aux-center": { title: "보조 관계 기준" },
        "aux-after": { title: "주 사슬 후속" },
        "aux-note": { title: "직접 관련 이슈" },
        "aux-origin": { title: "이슈를 발견한 작업", status: "closed" },
        "aux-found": { title: "작업 중 발견한 이슈" },
      },
      [
        ["aux-center", "aux-before"],
        ["aux-after", "aux-center"],
      ],
      [
        ["aux-center", "aux-note", "related"],
        ["aux-center", "aux-origin", "discovered-from"],
        ["aux-found", "aux-center", "discovered-from"],
      ],
    ),
  );
  const lines = await renderedEdges(screen, 5);
  const canvas = screen.getByRole("region", { name: "의존 그래프" });
  for (const name of [
    "aux-before 다음에 aux-center",
    "aux-center 다음에 aux-after",
    "aux-center와 aux-note: 관련",
    "aux-origin: 이 작업 중 발견한 이슈 aux-center (aux-center: 이 이슈를 발견한 작업 aux-origin)",
    "aux-center: 이 작업 중 발견한 이슈 aux-found (aux-found: 이 이슈를 발견한 작업 aux-center)",
  ])
    await expect.element(canvas.getByRole("img", { name, exact: true })).toBeInTheDocument();
  expect(lines.map((line) => line.dataset.edge).toSorted()).toEqual([
    "blocks",
    "blocks",
    "discovered",
    "discovered",
    "related",
  ]);

  const node = (title: string) => canvas.getByRole("link", { name: new RegExp(title) });
  expect(canvas.element().querySelectorAll("[aria-current]")).toHaveLength(1);
  await expect.element(node("보조 관계 기준")).toHaveAttribute("aria-current", "true");
  expect(getComputedStyle(node("보조 관계 기준").element()).boxShadow).not.toBe("none");
  expect(getComputedStyle(node("주 사슬 선행").element()).boxShadow).toBe("none");
});

test("에픽 순서 보기는 열마다 단계 이름과 진행 요약을 보이고, 후손 이슈를 막는 에픽 밖 이슈를 점선 카드로, 카드마다 대기 수를 보이며, 기준 노드 강조는 없다", async () => {
  await page.viewport(1440, 900);
  const screen = await renderGraph(
    "epic",
    "plan-epic",
    graphData(
      {
        "plan-epic": { title: "계획 에픽", issueType: "epic" },
        "plan-1": { title: "계획 첫째", parent: "plan-epic", status: "closed" },
        "plan-2": { title: "계획 둘째", parent: "plan-epic" },
        "plan-3": {
          title: "계획 셋째",
          parent: "plan-epic",
          blockedBy: ["plan-2", "plan-outside"],
        },
        "plan-4": { title: "계획 넷째", parent: "plan-epic", blockedBy: ["plan-3"] },
        "plan-outside": { title: "계획 밖 선행" },
        "plan-loose": { title: "계획 순서 없음", parent: "plan-epic" },
      },
      [
        ["plan-2", "plan-1"],
        ["plan-3", "plan-2"],
        ["plan-4", "plan-3"],
        ["plan-outside", "plan-1"],
        ["plan-3", "plan-outside"],
      ],
    ),
  );
  const canvas = screen.getByRole("region", { name: "의존 그래프" });
  await expect.element(screen.getByText("전체 4단계 중 2단계 진행 중")).toBeVisible();
  for (const label of ["1단계 · 완료", "2단계 · 진행 중", "3단계", "4단계"])
    await expect.element(canvas.getByText(label, { exact: true })).toBeVisible();
  const second = canvas.element().querySelector(reactFlowDom.nodeOf("plan-2"))!;
  expect(
    canvas.getByText("2단계 · 진행 중", { exact: true }).element().getBoundingClientRect().x,
  ).toBeCloseTo(second.getBoundingClientRect().x, 0);

  await expect.poll(() => cardText(canvas, "계획 밖 선행")).toContain("에픽 밖");
  expect(
    getComputedStyle(canvas.getByRole("link", { name: /계획 밖 선행/ }).element()).borderTopStyle,
  ).toBe("dashed");
  expect(cardText(canvas, "계획 둘째")).not.toContain("에픽 밖");
  for (const [from, to] of [
    ["plan-1", "plan-outside"],
    ["plan-outside", "plan-3"],
  ])
    await expect
      .element(canvas.getByRole("img", { name: `${from} 다음에 ${to}`, exact: true }))
      .toBeInTheDocument();
  await expect.poll(() => cardText(canvas, "계획 둘째")).toContain("2개 대기");
  await expect.poll(() => cardText(canvas, "계획 밖 선행")).toContain("2개 대기");
  expect(cardText(canvas, "계획 넷째")).not.toContain("대기");
  expect(canvas.element().querySelectorAll("[aria-current]")).toHaveLength(0);

  const panel = screen.getByRole("region", { name: "선후 관계 없음" });
  const expand = panel.getByRole("button", { name: "선후 관계 없는 이슈 목록 펼치기" });
  await expect.element(expand).toHaveAttribute("aria-expanded", "false");
  await expand.click();
  await expect.element(panel.getByRole("link", { name: /계획 순서 없음/ })).toBeVisible();
  expect(canvas.getByRole("link", { name: /계획 순서 없음/ }).elements()).toHaveLength(0);
});

const LONG_PLAN_TITLE =
  "에픽 안의 다른 이슈와 선후 관계가 없는 긴 제목도 목록에서 마지막 글자까지 빠짐없이 확인하고 독립적으로 작업을 진행할 수 있도록 표시합니다";

test("선후 관계 없음 목록과 그래프 노드는 긴 제목을 끝까지 보이고 짧은 ID를 복사 단추로 보이며, 목록은 대기 수를 보이고 닫힌 이슈 행을 흐리게 그린다", async () => {
  await page.viewport(1440, 900);
  const screen = await renderGraph(
    "epic",
    "long-epic",
    graphData(
      {
        "long-epic": { title: "긴 제목 표시 확인", issueType: "epic" },
        "long-first": { title: LONG_PLAN_TITLE, parent: "long-epic", status: "closed" },
        "long-second": { title: "연결된 다음 작업", parent: "long-epic" },
        "long-alone": { title: LONG_PLAN_TITLE, parent: "long-epic" },
        "long-closed": { title: "완료한 독립 작업", parent: "long-epic", status: "closed" },
        "long-outside": { title: "에픽 밖에서 기다리는 작업", blockedBy: ["long-alone"] },
      },
      [
        ["long-second", "long-first"],
        ["long-outside", "long-alone"],
      ],
    ),
  );
  const panel = screen.getByRole("region", { name: "선후 관계 없음" });
  await expect
    .element(panel.getByText("에픽 안의 다른 이슈와 blocks 관계가 없는 이슈입니다."))
    .toBeVisible();
  expect(getComputedStyle(panel.element()).width).toBe("320px");
  expectWholeTitle(
    cardOf(panel, LONG_PLAN_TITLE).getByText(LONG_PLAN_TITLE, { exact: true }).element(),
  );
  expect(cardText(panel, LONG_PLAN_TITLE)).toContain("1개 대기");
  expect(copyButton(panel, "long-alone").element().textContent).toBe(shortIssueId("long-alone"));
  const closedRow = panel.getByRole("link", { name: /완료한 독립 작업/ }).element().parentElement!;
  expect(getComputedStyle(closedRow).opacity).toBe("0.5");

  const canvas = screen.getByRole("region", { name: "의존 그래프" });
  const node = canvas.getByRole("link", { name: new RegExp(LONG_PLAN_TITLE) });
  expect(getComputedStyle(node.element()).width).toBe("280px");
  expect(copyButton(canvas, "long-second").element().textContent).toBe(shortIssueId("long-second"));
  expectWholeTitle(
    cardOf(canvas, LONG_PLAN_TITLE).getByText(LONG_PLAN_TITLE, { exact: true }).element(),
  );
});

function copyButton(scope: Locator, id: string) {
  return scope.getByRole("button", { name: `${id} ID 복사`, exact: true });
}

/** 제목이 두 줄을 넘게 감겨도 잘리거나 스크롤되지 않고 모두 보입니다. */
function expectWholeTitle(title: Element) {
  expect(title.clientHeight).toBe(title.scrollHeight);
  expect(title.clientWidth).toBe(title.scrollWidth);
  expect(title.clientHeight).toBeGreaterThan(
    Number.parseFloat(getComputedStyle(title).lineHeight) * 2,
  );
}

type IssueSeed = {
  title: string;
  issueType?: string;
  parent?: string;
  status?: string;
  awaitType?: string;
  /** 대기 수를 세는 값입니다. bd blocked처럼 닫히지 않은 선행 이슈만 적습니다. */
  blockedBy?: string[];
};

/**
 * 이슈와 관계로 그래프 데이터를 만듭니다. blocks는 [기다리는 이슈, 막는 이슈] 쌍이고, others는 blocks가 아닌 관계를
 * [이슈, 의존 대상, 유형]으로 적습니다. 에픽 보기가 후손을 고르는 ancestorEpics는 parent를 한 단계만 따라 채웁니다.
 */
function graphData(
  issues: Record<string, IssueSeed>,
  blocks: (readonly [string, string])[],
  others: (readonly [string, string, string])[] = [],
): GraphData {
  return {
    issues: Object.entries(issues).map(([id, seed]) => issue(id, seed)),
    dependencies: [
      ...blocks.map(([issueId, dependsOnId]) => [issueId, dependsOnId, "blocks"] as const),
      ...others,
    ].map(([issueId, dependsOnId, type]) => ({ issueId, dependsOnId, type, createdAt: 0 })),
    ancestorEpics: Object.fromEntries(
      Object.entries(issues).flatMap(([id, { parent }]) => (parent ? [[id, [parent]]] : [])),
    ),
  };
}
