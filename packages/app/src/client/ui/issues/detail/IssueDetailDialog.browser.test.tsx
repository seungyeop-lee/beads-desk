import type { IssueDetail } from "@beads-desk/bd/issue";
import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { issueDetail } from "@/shared/domain/issues/issueFixture.testkit";
import { IssueDetailDialog } from "./IssueDetailDialog";

/** dialog가 서버에서 읽을 상세입니다. null이면 아직 받는 중입니다. */
const read = vi.hoisted(() => ({ detail: null as IssueDetail | null }));

// 사람 확인 영역이 gate마다 읽는 gate 상세는 고정 값으로 바꿉니다.
vi.mock("@/client/modules/issues/application/useIssueDetail", () => ({
  useIssueDetail: (id: string) =>
    id === "desk-1"
      ? { data: read.detail, error: null, loading: read.detail === null }
      : { data: issueDetail(id), error: null, loading: false },
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ workspace: "demo" }),
  usePathname: () => "/w/demo/issues",
  useSearchParams: () => new URLSearchParams({ issue: "desk-1" }),
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}));

function Screen() {
  return (
    <LocaleProvider locale="ko">
      <a href="/issues">목록의 링크</a>
      <button type="button">목록의 단추</button>
      <IssueDetailDialog
        location={{ issue: "desk-1", side: null }}
        previous={null}
        detailHref={({ issue }) => `/issues?issue=${issue}`}
        onClose={() => {}}
      />
    </LocaleProvider>
  );
}

test("상세를 받는 동안에는 화면의 링크와 단추 위에서도 progress 커서를 보이고, 상세가 열리면 원래 커서로 돌아오며 제목에는 text 커서를 보인다", async () => {
  read.detail = null;
  const screen = await render(<Screen />);
  const cursor = (element: Element) => getComputedStyle(element).cursor;
  const link = screen.getByRole("link", { name: "목록의 링크" }).element();
  const button = screen.getByRole("button", { name: "목록의 단추" }).element();

  await expect.poll(() => cursor(link)).toBe("progress");
  expect(cursor(button)).toBe("progress");

  read.detail = issueDetail("desk-1", { title: "시작할 작업" });
  await screen.rerender(<Screen />);
  await expect
    .element(screen.getByRole("dialog", { name: messages.issueDetail.dialog("desk-1") }))
    .toBeVisible();
  expect(cursor(link)).toBe("pointer");
  expect(cursor(button)).toBe("pointer");
  expect(cursor(screen.getByRole("button", { name: "시작할 작업", exact: true }).element())).toBe(
    "text",
  );
});

/** 사람 확인 영역을 화면 밖으로 밀어낼 만큼 긴 설명입니다. */
const LONG_DESCRIPTION = Array.from(
  { length: 60 },
  (_, index) => `${index + 1}번째 문단입니다.`,
).join("\n\n");

function GatedDetail({ scrollToHumanGate }: { scrollToHumanGate: boolean }) {
  return (
    <LocaleProvider locale="ko">
      {/* dialog 뒤의 목록이 길어도 목록은 스크롤되지 않아야 합니다. */}
      <div style={{ height: "300vh" }} />
      <IssueDetailDialog
        location={{ issue: "desk-1", side: null }}
        scrollToHumanGate={scrollToHumanGate}
        previous={null}
        detailHref={({ issue }) => `/issues?issue=${issue}`}
        onClose={() => {}}
      />
    </LocaleProvider>
  );
}

function gatedIssue(): IssueDetail {
  return issueDetail("desk-1", {
    title: "법무 검토를 기다리는 작업",
    description: LONG_DESCRIPTION,
    dependencyCount: 1,
    dependencies: [
      {
        id: "desk-gate",
        title: "법무 검토",
        status: "open",
        priority: 2,
        issueType: "gate",
        dependencyType: "blocks",
        awaitType: "human",
      },
    ],
  });
}

test("gate 응답 칸으로 열면 설명을 다 그린 뒤에도 사람 확인 영역이 보이는 영역 안에 있고, 뒤의 목록은 스크롤되지 않는다", async () => {
  read.detail = gatedIssue();
  const screen = await render(<GatedDetail scrollToHumanGate />);

  await expect.element(screen.getByText("60번째 문단입니다.")).toBeInTheDocument();
  await expect
    .element(screen.getByRole("heading", { name: messages.humanGate.panelTitle }))
    .toBeInViewport();
  await expect
    .element(screen.getByRole("button", { name: "법무 검토를 기다리는 작업", exact: true }))
    .not.toBeInViewport();
  expect(window.scrollY).toBe(0);
});

test("gate 응답 칸 없이 열면 설명이 길어도 상세가 맨 위에서 열린다", async () => {
  read.detail = gatedIssue();
  const screen = await render(<GatedDetail scrollToHumanGate={false} />);

  await expect.element(screen.getByText("60번째 문단입니다.")).toBeInTheDocument();
  await expect
    .element(screen.getByRole("button", { name: "법무 검토를 기다리는 작업", exact: true }))
    .toBeInViewport();
  await expect
    .element(screen.getByRole("heading", { name: messages.humanGate.panelTitle }))
    .not.toBeInViewport();
});
