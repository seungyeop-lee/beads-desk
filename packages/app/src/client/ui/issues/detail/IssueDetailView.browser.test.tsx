import type { IssueDetail } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import type { IssueWrites } from "@/client/modules/issues/application/useIssueWrites";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { graphHref } from "@/client/ui/screens/graph/graphAddress";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { IssueDetailView } from "./IssueDetailView";

const DETAIL_ADDRESS = "/issues?issue=desk-1";

vi.mock("next/navigation", () => ({
  usePathname: () => "/issues",
  useSearchParams: () => new URLSearchParams({ issue: "desk-1" }),
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}));

const WRITES: IssueWrites = {
  pending: false,
  error: null,
  dismissError: () => {},
  run: (write) => write(),
};

test("일반 이슈 상세의 선행·후속 그래프 링크가 연결된 이슈 영역의 제목보다 크고 진한 글자로 보인다", async () => {
  const screen = await renderDetail(detail({ issueType: "task" }));

  const caption = screen.getByRole("heading", { name: messages.issueDetail.linkedIssues });
  const link = screen.getByRole("link", { name: messages.graph.blockingChain, exact: true });
  expectMoreVisibleThanCaption(link.element(), caption.element());
  expect(link.element().getAttribute("href")).toBe(
    graphHref({ kind: "center", id: "desk-1" }, DETAIL_ADDRESS),
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
    graphHref({ kind: "epic", id: "desk-1" }, DETAIL_ADDRESS),
  );
  expect(chain.element().getAttribute("href")).toBe(
    graphHref({ kind: "center", id: "desk-1" }, DETAIL_ADDRESS),
  );
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

function renderDetail(issue: IssueDetail) {
  return render(
    <LocaleProvider locale="ko">
      <div style={{ width: 1152 }}>
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
  return {
    id: "desk-1",
    title: "연결된 이슈가 있는 이슈",
    status: "open",
    priority: 2,
    assignee: null,
    labels: [],
    parent: null,
    dependencyCount: 1,
    dependentCount: 0,
    createdAt: 0,
    updatedAt: 0,
    startedAt: null,
    closedAt: null,
    deferUntil: null,
    description: "",
    design: "",
    acceptanceCriteria: "",
    notes: "",
    closeReason: null,
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
    dependents: [],
    comments: [],
    ...fields,
  };
}
