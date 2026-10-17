import type { Issue } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import type { GraphData } from "@/shared/contract/graph";
import { GraphScreen } from "./GraphScreen";

let graph: GraphData = { issues: [], dependencies: [], ancestorEpics: {} };
let address = new URLSearchParams();

// 화면이 서버에서 읽는 그래프 데이터와 주소, 상세 dialog를 여는 부분은 고정 값으로 바꿉니다.
vi.mock("@/client/modules/graph/application/useGraph", () => ({
  useGraph: () => ({ data: graph, error: null, loading: false }),
}));
vi.mock("@/client/ui/issues/IssueDetailRoute", () => ({
  IssueDetailRoute: () => null,
  useIssueHref: () => (id: string) => `/graph?issue=${id}`,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/graph",
  useSearchParams: () => address,
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}));

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
    const node = (key: keyof typeof SKIP_TITLES) =>
      canvas.getByRole("link", { name: new RegExp(SKIP_TITLES[key]) });
    const edge = (from: string, to: string) =>
      canvas.getByRole("img", { name: `${from} 다음에 ${to}` });
    for (const [from, to] of SKIP_EDGES) await expect.element(edge(from, to)).toBeInTheDocument();
    await expect.element(node("skip-d")).toBeVisible();

    const boxes = Object.keys(SKIP_TITLES).map((key) => ({
      key,
      box: node(key as keyof typeof SKIP_TITLES)
        .element()
        .getBoundingClientRect(),
    }));
    for (const [from, to] of SKIP_EDGES) {
      const points = pathPoints(edge(from, to).element().querySelector("path")!);
      const covering = boxes
        .filter(({ key }) => key !== from && key !== to)
        .filter(({ box }) => points.some((point) => inside(point, box)))
        .map(({ key }) => key);
      expect(covering, `${from} → ${to} 간선을 가리는 노드`).toEqual([]);
    }
  });

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

/** WCAG 상대 휘도입니다. 계산된 CSS 색을 canvas에 칠해 sRGB 값으로 바꿉니다. */
function luminance(color: string): number {
  const context = document.createElement("canvas").getContext("2d")!;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
  expect(alpha, `${color}는 불투명해야 합니다`).toBe(255);
  const linear = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r!) + 0.7152 * linear(g!) + 0.0722 * linear(b!);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
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
  for (const text of [
    "실선 화살표: 선행 → 후속",
    "굵은 실선 화살표: gate 대기 조건(선행 → 후속)",
    "보라색 굵은 실선 화살표: 사람 판단을 기다리는 gate",
    "점선: 관련",
    "파선 화살표: 발견한 작업 → 발견한 이슈",
  ])
    expect(legend.textContent).toContain(text);
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
  const card = (title: string) => canvas.getByRole("link", { name: new RegExp(title) });
  await expect.element(card("에픽 밖 카드")).toBeVisible();
  expect(
    ["닫힌 카드", "에픽 밖 카드"].map((title) => getComputedStyle(card(title).element()).opacity),
  ).toEqual(["1", "1"]);
  const titleColor = (title: string) =>
    getComputedStyle(card(title).getByText(title, { exact: true }).element()).color;
  expect(titleColor("닫힌 카드")).not.toBe(titleColor("열린 카드"));
  expect(titleColor("에픽 밖 카드")).toBe(titleColor("열린 카드"));
});

type IssueSeed = {
  title: string;
  issueType?: string;
  parent?: string;
  status?: string;
  awaitType?: string;
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

function issue(
  id: string,
  { title, issueType = "task", parent, status = "open", awaitType }: IssueSeed,
): Issue {
  return {
    id,
    title,
    status,
    priority: 2,
    issueType,
    assignee: null,
    labels: [],
    parent: parent ?? null,
    dependencyCount: 0,
    dependentCount: 0,
    createdAt: 0,
    updatedAt: 0,
    startedAt: null,
    closedAt: null,
    deferUntil: null,
    ...(awaitType && { awaitType }),
  };
}
