import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { koMessages as messages } from "@/client/modules/locale/domain/koMessages";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import type { ActivityEntry } from "@/shared/contract/activityFeed";
import { ActivityFeedScreen } from "./ActivityFeedScreen";

const HOUR = 60 * 60 * 1000;

// 화면이 보는 workspace와 주소의 query, 서버에서 읽는 기록, workspace마다 저장된 마지막으로 본 시각을 테스트마다 바꿉니다.
const tab = vi.hoisted(() => ({
  workspace: "alpha",
  query: "",
  entries: [] as ActivityEntry[],
  seen: new Map<string, number>(),
}));

vi.mock("@/client/modules/activityFeed/application/useActivityFeed", () => ({
  useActivityFeed: () => ({
    page: { entries: tab.entries, hasMore: false },
    error: null,
    loading: false,
    showMore: () => {},
  }),
}));
vi.mock("@/client/infra/activityFeed/activitySeenStore", () => ({
  loadActivitySeenAt: (workspace: string) => tab.seen.get(workspace) ?? null,
  saveActivitySeenAt: (workspace: string, at: number) => tab.seen.set(workspace, at),
}));
vi.mock("@/client/infra/workspaces/documentWorkspace", () => ({
  documentWorkspace: () => tab.workspace,
}));
vi.mock("@/client/ui/issues/IssueDetailRoute", () => ({
  IssueDetailRoute: () => null,
  useIssueHref: () => (id: string) => `/activity?issue=${id}`,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ workspace: tab.workspace }),
  usePathname: () => `/w/${tab.workspace}/activity`,
  useSearchParams: () => new URLSearchParams(tab.query),
  useRouter: () => ({ push: () => {}, replace: () => {} }),
}));

function entry(key: string, at: number): ActivityEntry {
  return {
    key,
    kind: "commented",
    at,
    issueId: key,
    title: `${key} 제목`,
    actor: "agent",
    text: null,
  };
}

async function openScreen() {
  return render(
    <LocaleProvider locale="ko">
      <ActivityFeedScreen />
    </LocaleProvider>,
  );
}

/** 목록의 줄을 차례로 읽습니다. 기록은 이슈 id, 구분선은 `---`이고 날짜 머리글은 뺍니다. */
function feedShape(): string[] {
  const list = document.querySelector(`ol[aria-label="${messages.activityFeed.entries}"]`)!;
  return [...list.children].flatMap((row) => {
    if (row.textContent === messages.activityFeed.seenBefore) return ["---"];
    const issueLink = row.querySelector("a[aria-label]");
    return issueLink ? [issueLink.getAttribute("aria-label")!.split(" ")[0]!] : [];
  });
}

let now: number;

beforeEach(() => {
  tab.seen.clear();
  now = Date.now();
  tab.workspace = "alpha";
  tab.query = "";
  tab.entries = [entry("t-new", now - HOUR), entry("t-old", now - 3 * HOUR)];
});

test("마지막으로 본 시각 뒤의 기록과 그 전 기록 사이에 구분선을 긋고, 연 시각을 새 값으로 저장해도 연 동안에는 구분선이 그대로다", async () => {
  tab.seen.set("alpha", now - 2 * HOUR);

  const screen = await openScreen();

  await expect.element(screen.getByText(messages.activityFeed.seenBefore)).toBeVisible();
  expect(feedShape()).toEqual(["t-new", "---", "t-old"]);
  expect(tab.seen.get("alpha")).toBeGreaterThanOrEqual(now);

  tab.entries = [entry("t-newer", Date.now()), ...tab.entries];
  await screen.rerender(
    <LocaleProvider locale="ko">
      <ActivityFeedScreen />
    </LocaleProvider>,
  );
  expect(feedShape()).toEqual(["t-newer", "t-new", "---", "t-old"]);
});

test("다시 열면 직전에 연 시각으로 구분선이 옮겨진다", async () => {
  tab.seen.set("alpha", now - 2 * HOUR);
  const first = await openScreen();
  await expect.element(first.getByText(messages.activityFeed.seenBefore)).toBeVisible();
  await first.unmount();
  tab.entries = [entry("t-later", Date.now() + HOUR), ...tab.entries];

  const second = await openScreen();

  await expect.element(second.getByText(messages.activityFeed.seenBefore)).toBeVisible();
  expect(feedShape()).toEqual(["t-later", "---", "t-new", "t-old"]);
});

test("날짜 범위를 고른 채로 열면 구분선은 그리되 마지막으로 본 시각을 바꾸지 않는다", async () => {
  const seenAt = now - 2 * HOUR;
  tab.seen.set("alpha", seenAt);
  tab.query = "from=2026-10-01";

  const screen = await openScreen();

  await expect.element(screen.getByText(messages.activityFeed.seenBefore)).toBeVisible();
  expect(feedShape()).toEqual(["t-new", "---", "t-old"]);
  expect(tab.seen.get("alpha")).toBe(seenAt);
});

test("저장된 값이 없으면 구분선을 그리지 않고, 다른 workspace의 값은 바꾸지 않는다", async () => {
  const otherSeenAt = now - 2 * HOUR;
  tab.seen.set("beta", otherSeenAt);

  const screen = await openScreen();

  await expect.element(screen.getByText("t-new 제목")).toBeVisible();
  await vi.waitFor(() => expect(tab.seen.get("alpha")).toBeDefined());
  expect(feedShape()).toEqual(["t-new", "t-old"]);
  expect(tab.seen.get("beta")).toBe(otherSeenAt);
});

test("넓은 창에서는 목록이 화면 틀의 폭을 다 써서 오른쪽 끝이 날짜 입력칸과 맞는다", async () => {
  await page.viewport(1440, 900);

  const screen = await openScreen();

  await expect.element(screen.getByText("t-new 제목")).toBeVisible();
  const list = screen.getByRole("list", { name: messages.activityFeed.entries }).element();
  const dateTo = screen.getByLabelText(messages.activityFeed.dateTo).element();
  expect(list.getBoundingClientRect().right).toBeCloseTo(dateTo.getBoundingClientRect().right, 0);
});

test("좁은 창에서도 목록과 날짜 입력칸이 가로로 넘치지 않는다", async () => {
  await page.viewport(441, 900);

  const screen = await openScreen();

  await expect.element(screen.getByText("t-new 제목")).toBeVisible();
  expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth);
});
