import type { IssueDetail } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { graphHref } from "@/client/ui/screens/graph/graphAddress";
import { issueDetail } from "@/shared/domain/issues/issueFixture.testkit";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { IssueDetailView } from "./IssueDetailView";

const DETAIL_ADDRESS = "/issues?issue=desk-1";

vi.mock("next/navigation", () => ({
  useParams: () => ({ workspace: "demo" }),
  usePathname: () => "/w/demo/issues",
  useSearchParams: () => new URLSearchParams({ issue: "desk-1" }),
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}));

// 사람 확인 영역이 gate마다 읽는 gate 상세는 고정 값으로 바꿉니다.
vi.mock("@/client/modules/issues/application/useIssueDetail", () => ({
  useIssueDetail: (id: string) => ({ data: issueDetail(id), error: null, loading: false }),
}));

const WRITES: IssueWrites = {
  pending: false,
  error: null,
  dismissError: () => {},
  run: (write) => write("demo"),
};

test("일반 이슈 상세의 선행·후속 그래프 링크가 연결된 이슈 영역의 제목보다 크고 진한 글자로 보인다", async () => {
  const screen = await renderDetail(detail({ issueType: "task" }));

  const caption = screen.getByRole("heading", { name: messages.issueDetail.linkedIssues });
  const link = screen.getByRole("link", { name: messages.graph.blockingChain, exact: true });
  expectMoreVisibleThanCaption(link.element(), caption.element());
  expect(link.element().getAttribute("href")).toBe(
    `/w/demo${graphHref({ kind: "center", id: "desk-1" }, DETAIL_ADDRESS)}`,
  );
  expect(screen.getByRole("link", { name: messages.graph.epicOrder }).query()).toBeNull();
});

test("에픽 상세에서 순서 보기와 선행·후속 그래프 링크가 같은 모습으로 나란히 보인다", async () => {
  const screen = await renderDetail(detail({ issueType: "epic" }));

  const caption = screen.getByRole("heading", { name: messages.issueDetail.linkedIssues });
  const order = screen.getByRole("link", { name: messages.graph.epicOrder, exact: true });
  const chain = screen.getByRole("link", { name: messages.graph.blockingChain, exact: true });
  for (const link of [order, chain])
    expectMoreVisibleThanCaption(link.element(), caption.element());

  expect(look(order.element())).toEqual(look(chain.element()));
  const orderBox = order.element().getBoundingClientRect();
  const chainBox = chain.element().getBoundingClientRect();
  expect(orderBox.top).toBe(chainBox.top);
  expect(orderBox.right).toBeLessThanOrEqual(chainBox.left);

  expect(order.element().getAttribute("href")).toBe(
    `/w/demo${graphHref({ kind: "epic", id: "desk-1" }, DETAIL_ADDRESS)}`,
  );
  expect(chain.element().getAttribute("href")).toBe(
    `/w/demo${graphHref({ kind: "center", id: "desk-1" }, DETAIL_ADDRESS)}`,
  );
});

test("막힘 안내, 사람 확인 영역, 연결된 이슈 목록은 선행 이슈와 gate의 ID를 복사 단추로 보인다", async () => {
  const gate = {
    id: "desk-gate",
    title: "Review: desk-1",
    status: "open",
    priority: 2,
    issueType: "gate",
    dependencyType: "blocks",
    awaitType: "human",
  };
  const screen = await renderDetail(
    issueDetail("desk-1", {
      title: "막힌 이슈",
      dependencyCount: 2,
      dependencies: [...detail({ issueType: "task" }).dependencies, gate],
    }),
  );
  const copyButton = (region: string, id: string) =>
    screen
      .getByRole("region", { name: region, exact: true })
      .getByRole("button", { name: messages.copyId.labelOf(id), exact: true });

  for (const id of ["desk-2", "desk-gate"]) {
    await expect.element(copyButton(messages.blocking.bannerTitle, id)).toBeVisible();
    await expect.element(copyButton(messages.issueDetail.linkedIssues, id)).toBeVisible();
  }
  await expect.element(copyButton(messages.humanGate.panelTitle, "desk-gate")).toBeVisible();
});

// 옆 패널을 열어 주 상세가 56rem(@4xl)보다 좁아지면 속성 열이 풀려 속성 입력이 본문 위로 옮겨 그려집니다.
for (const width of [704, 1152])
  test(`주 상세 폭 ${width}px에서도 상태와 우선순위 입력은 하나씩만 그려져 label이 그 입력을 가리킨다`, async () => {
    const screen = await renderDetail(detail({ issueType: "task" }), width);

    for (const [id, label] of [
      ["issue-status", messages.issue.status],
      ["issue-priority", messages.issue.priority],
    ]) {
      expect(document.querySelectorAll(`#${id}`)).toHaveLength(1);
      await expect
        .element(screen.getByRole("combobox", { name: label, exact: true }))
        .toHaveAttribute("id", id);
    }
  });

/** 링크는 연결된 이슈 영역의 제목(caption)보다 글자가 크고 덜 투명해야 영역을 훑지 않고도 눈에 띕니다. */
function expectMoreVisibleThanCaption(link: Element, caption: Element) {
  const linkStyle = getComputedStyle(link);
  const captionStyle = getComputedStyle(caption);
  expect(parseFloat(linkStyle.fontSize)).toBeGreaterThan(parseFloat(captionStyle.fontSize));
  expect(alphaOf(linkStyle.color)).toBeGreaterThan(alphaOf(captionStyle.color));
}

function look(element: Element) {
  const { fontSize, fontWeight, color, backgroundColor, borderColor, height } =
    getComputedStyle(element);
  return { fontSize, fontWeight, color, backgroundColor, borderColor, height };
}

/** 계산된 색은 브라우저가 rgb()·oklab()·color() 중 하나로 돌려주며, 불투명도는 `/ 값` 또는 rgba의 네 번째 값으로 적힙니다. */
function alphaOf(color: string) {
  const slash = color.match(/\/\s*([\d.]+)\s*\)$/);
  if (slash) return Number(slash[1]);
  const rgba = color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/);
  return rgba ? Number(rgba[1]) : 1;
}

function renderDetail(issue: IssueDetail, width = 1152) {
  return render(
    <LocaleProvider locale="ko">
      <div style={{ width }}>
        <IssueDetailView
          issue={issue}
          writes={WRITES}
          issueHref={(id) => `/issues?issue=${id}`}
          onDeleted={() => {}}
        />
      </div>
    </LocaleProvider>,
  );
}

function detail(fields: Pick<IssueDetail, "issueType">): IssueDetail {
  return issueDetail("desk-1", {
    title: "연결된 이슈가 있는 이슈",
    dependencyCount: 1,
    dependencies: [
      {
        id: "desk-2",
        title: "먼저 끝나야 하는 이슈",
        status: "open",
        priority: 2,
        issueType: "task",
        dependencyType: "blocks",
        awaitType: "",
      },
    ],
    ...fields,
  });
}
