import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { playNotificationSound } from "@/client/infra/notifications/notificationSound";

/** 같은 이름의 다른 channel에 메시지를 바로 전달합니다. 실제 BroadcastChannel처럼 보낸 channel 자신은 받지 않습니다. */
class FakeBroadcastChannel extends EventTarget {
  static open: FakeBroadcastChannel[] = [];
  constructor(readonly name: string) {
    super();
    FakeBroadcastChannel.open.push(this);
  }
  postMessage(data: unknown) {
    for (const other of FakeBroadcastChannel.open) {
      if (other !== this && other.name === this.name) {
        other.dispatchEvent(new MessageEvent("message", { data }));
      }
    }
  }
  close() {
    FakeBroadcastChannel.open = FakeBroadcastChannel.open.filter((channel) => channel !== this);
  }
}

/** 탭들이 함께 쓰는 Web Locks API에서 shared lock을 쥐고 목록을 읽는 부분입니다. */
class FakeLocks {
  private held: string[] = [];
  async request(
    name: string,
    _options: { mode: LockMode; signal: AbortSignal },
    callback: () => Promise<unknown>,
  ) {
    this.held.push(name);
    try {
      return await callback();
    } finally {
      this.held.splice(this.held.indexOf(name), 1);
    }
  }
  async query() {
    return { held: this.held.map((name) => ({ name, mode: "shared" })) };
  }
}

/** 브라우저의 사용자 조작 기록입니다. 탭들이 전역을 함께 쓰므로, 조작한 탭의 입력을 처리하는 동안만 켭니다. */
const userActivation = { hasBeenActive: false };
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

type Tab = {
  /** 이 탭에서 사용자가 누르는 입력을 보냅니다. */
  click: () => Promise<void>;
  /** 이 탭에서 브라우저가 알림음을 재생하면 호출됩니다. 소리를 막으면 false를 돌려줍니다. */
  play: ReturnType<typeof vi.fn<typeof playNotificationSound>>;
  playNoticeSound: () => Promise<boolean>;
};

/** module 상태와 window를 탭마다 따로 갖도록 새로 불러와, 다른 탭의 알림음 부탁을 받기 시작합니다. */
async function openTab({ soundAllowed = true } = {}): Promise<Tab> {
  vi.resetModules();
  const play = vi.fn<typeof playNotificationSound>(async () => soundAllowed);
  vi.doMock("@/client/infra/notifications/notificationSound", () => ({
    playNotificationSound: play,
  }));
  const tabWindow = new EventTarget();
  vi.stubGlobal("window", tabWindow);
  const relay = await import("@/client/infra/notifications/notificationSoundRelay");
  const { playNoticeSound } = await import("./noticeSound");
  relay.offerNotificationSound();
  return {
    play,
    playNoticeSound,
    click: async () => {
      userActivation.hasBeenActive = true;
      tabWindow.dispatchEvent(new Event("pointerdown"));
      userActivation.hasBeenActive = false;
      await flush();
    },
  };
}

beforeEach(() => {
  FakeBroadcastChannel.open = [];
  userActivation.hasBeenActive = false;
  vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
  vi.stubGlobal("navigator", { locks: new FakeLocks(), userActivation });
});

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock("@/client/infra/notifications/notificationSound");
  vi.unstubAllGlobals();
});

test("이 탭에서 소리를 낼 수 있으면 직접 재생하고 다른 탭에 부탁하지 않는다", async () => {
  const notifying = await openTab();
  const other = await openTab();
  await other.click();
  userActivation.hasBeenActive = true;

  await expect(notifying.playNoticeSound()).resolves.toBe(true);
  expect(notifying.play).toHaveBeenCalledOnce();
  expect(other.play).not.toHaveBeenCalled();
});

test("이 탭이 소리를 낼 수 없으면 사용자가 누른 적 있는 다른 탭 하나만 대신 재생한다", async () => {
  const notifying = await openTab();
  const clicked = await openTab();
  const alsoClicked = await openTab();
  const neverClicked = await openTab();
  await clicked.click();
  await alsoClicked.click();

  await expect(notifying.playNoticeSound()).resolves.toBe(true);
  expect(notifying.play).not.toHaveBeenCalled();
  expect(clicked.play.mock.calls.length + alsoClicked.play.mock.calls.length).toBe(1);
  expect(neverClicked.play).not.toHaveBeenCalled();
});

test("누른 적 있는 탭에서 브라우저가 소리를 막으면 다음 탭에 부탁한다", async () => {
  const notifying = await openTab();
  const blocked = await openTab({ soundAllowed: false });
  const allowed = await openTab();
  await blocked.click();
  await allowed.click();

  await expect(notifying.playNoticeSound()).resolves.toBe(true);
  expect(blocked.play).toHaveBeenCalledOnce();
  expect(allowed.play).toHaveBeenCalledOnce();
});

test("어느 탭도 사용자가 누른 적이 없으면 아무 탭도 재생하지 않는다", async () => {
  const notifying = await openTab();
  const other = await openTab();

  await expect(notifying.playNoticeSound()).resolves.toBe(false);
  expect(notifying.play).not.toHaveBeenCalled();
  expect(other.play).not.toHaveBeenCalled();
});

test("부탁한 탭이 답하지 않으면 알림음이 두 번 나지 않도록 다른 탭에 더 부탁하지 않는다", async () => {
  const notifying = await openTab();
  const silent = await openTab();
  const other = await openTab();
  await silent.click();
  await other.click();
  silent.play.mockReturnValue(new Promise(() => {}));
  vi.useFakeTimers();

  const played = notifying.playNoticeSound();
  await vi.runAllTimersAsync();

  await expect(played).resolves.toBe(false);
  expect(other.play).not.toHaveBeenCalled();
});
