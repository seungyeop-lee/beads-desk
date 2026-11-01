import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { readHumanDecisionItems } from "@/client/infra/humanDecisions/humanDecisionItemsApiClient";
import {
  loadNoticePreference,
  saveNoticePreference,
  subscribeNoticePreference,
} from "@/client/infra/humanDecisions/noticePreferenceStore";
import {
  type NotificationAccess,
  notificationAccess,
  requestNotificationAccess,
  showBrowserNotification,
} from "@/client/infra/notifications/browserNotifications";
import {
  subscribeWatchedWorkspaceChanges,
  type WatchedWorkspaceChange,
} from "@/client/infra/workspaceEvents/workspaceEventSource";
import {
  attendedWorkspaces,
  holdWorkspaceAttention,
} from "@/client/infra/workspaces/workspaceAttention";
import { MESSAGES } from "@/client/modules/locale/domain/messages";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type { HumanDecisionItem } from "@/shared/contract/humanDecisions";

vi.mock("@/client/infra/humanDecisions/humanDecisionItemsApiClient", () => ({
  readHumanDecisionItems: vi.fn<typeof readHumanDecisionItems>(),
}));
vi.mock("@/client/infra/humanDecisions/noticePreferenceStore", () => ({
  loadNoticePreference: vi.fn<typeof loadNoticePreference>(),
  saveNoticePreference: vi.fn<typeof saveNoticePreference>(),
  subscribeNoticePreference: vi.fn<typeof subscribeNoticePreference>(() => () => {}),
}));
vi.mock("@/client/infra/notifications/browserNotifications", () => ({
  notificationAccess: vi.fn<typeof notificationAccess>(),
  requestNotificationAccess: vi.fn<typeof requestNotificationAccess>(),
  showBrowserNotification: vi.fn<typeof showBrowserNotification>(),
}));
vi.mock("@/client/infra/workspaceEvents/workspaceEventSource", () => ({
  subscribeWatchedWorkspaceChanges: vi.fn<typeof subscribeWatchedWorkspaceChanges>(),
}));
vi.mock("@/client/infra/workspaces/workspaceAttention", () => ({
  attendedWorkspaces: vi.fn<typeof attendedWorkspaces>(),
  holdWorkspaceAttention: vi.fn<typeof holdWorkspaceAttention>(),
}));
vi.mock("@/client/infra/locale/documentLocale", () => ({
  documentMessages: () => MESSAGES.ko,
}));

type Notices = typeof import("./humanDecisionNotices");

/** 판단 기다림 목록을 workspace마다 정해 두고, 조회가 올 때마다 그 목록을 돌려줍니다. */
const decisions = new Map<string, HumanDecisionItem[]>();
let announce: (change: WatchedWorkspaceChange) => void = () => {};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** module 상태를 테스트마다 새로 갖도록 다시 불러와 감시를 시작합니다. */
async function startWatching(): Promise<Notices> {
  vi.resetModules();
  const notices = await import("./humanDecisionNotices");
  notices.watchHumanDecisionNotices();
  return notices;
}

function enable(access: NotificationAccess = "granted") {
  vi.mocked(loadNoticePreference).mockReturnValue(true);
  vi.mocked(notificationAccess).mockReturnValue(access);
}

beforeEach(() => {
  decisions.clear();
  vi.mocked(loadNoticePreference).mockReturnValue(false);
  vi.mocked(notificationAccess).mockReturnValue("default");
  vi.mocked(attendedWorkspaces).mockResolvedValue([]);
  vi.mocked(subscribeWatchedWorkspaceChanges).mockImplementation((listener) => {
    announce = listener;
    return () => {};
  });
  vi.mocked(readHumanDecisionItems).mockImplementation(
    async (workspace): Promise<ApiResponse<HumanDecisionItem[]>> => ({
      ok: true,
      data: decisions.get(workspace) ?? [],
    }),
  );
});

afterEach(() => {
  vi.resetAllMocks();
});

test("알림을 켜지 않았으면 변경 알림을 받아도 판단 기다림을 읽지 않고 권한도 요청하지 않는다", async () => {
  await startWatching();

  announce({ watched: ["a"], changed: ["a"] });
  await flush();

  expect(readHumanDecisionItems).not.toHaveBeenCalled();
  expect(requestNotificationAccess).not.toHaveBeenCalled();
  expect(showBrowserNotification).not.toHaveBeenCalled();
});

test("켠 표시가 있어도 권한이 허용 상태가 아니면 판단 기다림을 읽지 않는다", async () => {
  enable("denied");
  await startWatching();

  announce({ watched: ["a"], changed: ["a"] });
  await flush();

  expect(readHumanDecisionItems).not.toHaveBeenCalled();
});

test("바뀐 workspace를 지정해 읽고, 새로 생긴 판단 기다림을 그 workspace의 판단 기다림 화면 주소와 함께 알린다", async () => {
  enable();
  await startWatching();
  decisions.set("b", [{ id: "g-1", title: "배포 승인" }]);
  announce({ watched: ["a", "b"], changed: ["a", "b"] });
  await flush();

  decisions.set("b", [
    { id: "g-1", title: "배포 승인" },
    { id: "q-1", title: "어느 방식으로 할까요" },
    { id: "q-2", title: "" },
  ]);
  announce({ watched: ["a", "b"], changed: ["b"] });
  await flush();

  expect(vi.mocked(readHumanDecisionItems).mock.calls).toEqual([["a"], ["b"], ["b"]]);
  expect(showBrowserNotification).toHaveBeenCalledExactlyOnceWith({
    title: "b: 판단 기다림",
    body: "어느 방식으로 할까요 외 1건",
    url: "/w/b/human",
  });
});

test("사용자가 어느 탭에서든 보고 있는 workspace는 알리지 않고, 보고 있지 않은 workspace만 알린다", async () => {
  enable();
  // 연결을 연 이 탭이 아니라 다른 탭에서 a를 보고 있어도 lock 목록에 들어 있습니다.
  vi.mocked(attendedWorkspaces).mockResolvedValue(["a"]);
  await startWatching();
  announce({ watched: ["a", "b"], changed: ["a", "b"] });
  await flush();

  decisions.set("a", [{ id: "q-1", title: "어느 방식으로 할까요" }]);
  decisions.set("b", [{ id: "q-2", title: "이름을 바꿀까요" }]);
  announce({ watched: ["a", "b"], changed: ["a", "b"] });
  await flush();

  expect(showBrowserNotification).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ url: "/w/b/human" }),
  );
});

test("읽는 중에 같은 workspace의 변경 알림이 여러 번 오면 읽기가 끝난 뒤 한 번만 다시 읽는다", async () => {
  enable();
  await startWatching();
  let finishRead: () => void = () => {};
  vi.mocked(readHumanDecisionItems).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishRead = () => resolve({ ok: true, data: [] });
      }),
  );

  announce({ watched: ["a"], changed: ["a"] });
  announce({ watched: ["a"], changed: ["a"] });
  announce({ watched: ["a"], changed: ["a"] });
  finishRead();
  await flush();

  expect(readHumanDecisionItems).toHaveBeenCalledTimes(2);
});

test("알림을 켜면 감시하는 workspace를 바로 읽어 기준을 두고, 켠 뒤 처음 생긴 판단 기다림부터 알린다", async () => {
  const notices = await startWatching();
  announce({ watched: ["a"], changed: [] });
  decisions.set("a", [{ id: "g-1", title: "배포 승인" }]);

  vi.mocked(requestNotificationAccess).mockResolvedValue("granted");
  enable();
  await expect(notices.turnOnHumanDecisionNotices()).resolves.toBe("granted");
  await flush();
  expect(showBrowserNotification).not.toHaveBeenCalled();

  decisions.set("a", [
    { id: "g-1", title: "배포 승인" },
    { id: "q-1", title: "어느 방식으로 할까요" },
  ]);
  announce({ watched: ["a"], changed: ["a"] });
  await flush();

  expect(showBrowserNotification).toHaveBeenCalledOnce();
});

test("권한을 거부하면 알림을 켜지 않는다", async () => {
  const notices = await startWatching();
  vi.mocked(requestNotificationAccess).mockResolvedValue("denied");

  await expect(notices.turnOnHumanDecisionNotices()).resolves.toBe("denied");
  expect(saveNoticePreference).not.toHaveBeenCalled();
});
