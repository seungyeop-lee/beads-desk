import { afterEach, beforeEach, expect, test, vi } from "vitest";

type WorkspaceEvents = typeof import("./workspaceEventSource");

class FakeEventSource extends EventTarget {
  static instances: FakeEventSource[] = [];
  closed = false;

  constructor(readonly url: string) {
    super();
    FakeEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  emit(type: string) {
    this.dispatchEvent(new Event(type));
  }
}

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

/** 이름 하나만 다루는 Web Locks API입니다. */
class FakeLocks {
  private held = false;
  private waiting: (() => void)[] = [];

  async request(
    _name: string,
    options: { ifAvailable?: boolean; signal?: AbortSignal },
    callback: (lock: object | null) => unknown,
  ) {
    if (options.ifAvailable && this.held) return callback(null);
    if (this.held) {
      await new Promise<void>((resolve, reject) => {
        this.waiting.push(resolve);
        options.signal?.addEventListener("abort", () => {
          this.waiting = this.waiting.filter((waiter) => waiter !== resolve);
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    }
    this.held = true;
    try {
      return await callback({});
    } finally {
      this.held = false;
      this.waiting.shift()?.();
    }
  }
}

class FakeDocument extends EventTarget {
  visibilityState: DocumentVisibilityState = "visible";

  setVisibility(state: DocumentVisibilityState) {
    this.visibilityState = state;
    this.dispatchEvent(new Event("visibilitychange"));
  }
}

let fakeDocument: FakeDocument;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const latestSource = () => FakeEventSource.instances.at(-1)!;

/** 탭 하나의 module 상태를 따로 갖도록 매번 새로 불러옵니다. */
async function openTab(): Promise<WorkspaceEvents> {
  vi.resetModules();
  return import("./workspaceEventSource");
}

beforeEach(() => {
  FakeEventSource.instances = [];
  FakeBroadcastChannel.open = [];
  fakeDocument = new FakeDocument();
  vi.stubGlobal("EventSource", FakeEventSource);
  vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
  vi.stubGlobal("navigator", { locks: new FakeLocks() });
  vi.stubGlobal("document", fakeDocument);
});

afterEach(async () => {
  // 구독 해제 뒤 연결은 다음 task에 닫히므로, 다음 테스트가 시작되기 전에 정리를 마칩니다.
  await flush();
  await flush();
  vi.unstubAllGlobals();
});

test("invalidate 이벤트를 받으면 구독자에게 알린다", async () => {
  const events = await openTab();
  const listener = vi.fn<() => void>();
  const unsubscribe = events.subscribeWorkspaceInvalidation(listener);
  await flush();

  latestSource().emit("open");
  latestSource().emit("invalidate");
  unsubscribe();
  await flush();

  expect(latestSource().url).toBe("/api/events");
  expect(listener).toHaveBeenCalledOnce();
  expect(latestSource().closed).toBe(true);
});

test("여러 탭이 SSE 연결 하나를 함께 쓴다", async () => {
  const first = vi.fn<() => void>();
  const second = vi.fn<() => void>();
  const stopFirst = (await openTab()).subscribeWorkspaceInvalidation(first);
  const stopSecond = (await openTab()).subscribeWorkspaceInvalidation(second);
  await flush();

  latestSource().emit("open");
  latestSource().emit("invalidate");
  const openedWhileBothSubscribed = FakeEventSource.instances.length;
  stopFirst();
  stopSecond();

  expect(openedWhileBothSubscribed).toBe(1);
  expect([first.mock.calls.length, second.mock.calls.length]).toEqual([1, 1]);
});

test("연결을 연 탭이 떠나면 다른 탭이 이어받고, 그 사이 놓친 변경을 반영하도록 알린다", async () => {
  const stopFirst = (await openTab()).subscribeWorkspaceInvalidation(() => {});
  const second = vi.fn<() => void>();
  const stopSecond = (await openTab()).subscribeWorkspaceInvalidation(second);
  await flush();
  const firstSource = latestSource();

  stopFirst();
  await flush();
  latestSource().emit("open");
  stopSecond();

  expect(firstSource.closed).toBe(true);
  expect(latestSource()).not.toBe(firstSource);
  expect(second).toHaveBeenCalledOnce();
});

test("구독을 해제하자마자 다시 구독하면 연결을 유지하고 다른 탭에 알리지 않는다", async () => {
  const events = await openTab();
  const stopFirst = events.subscribeWorkspaceInvalidation(() => {});
  await flush();
  const other = vi.fn<() => void>();
  const stopOther = (await openTab()).subscribeWorkspaceInvalidation(other);
  await flush();
  latestSource().emit("open");

  // 화면 조건이 바뀌면 React가 같은 시점에 이전 구독을 해제하고 새로 구독합니다.
  stopFirst();
  const stopAgain = events.subscribeWorkspaceInvalidation(() => {});
  await flush();
  await flush();
  latestSource().emit("open");
  const sources = FakeEventSource.instances.length;
  stopAgain();
  stopOther();

  expect(sources).toBe(1);
  expect(other).not.toHaveBeenCalled();
});

test("끊겼다가 다시 연결되면 놓친 변경이 있을 수 있어 구독자에게 알린다", async () => {
  const listener = vi.fn<() => void>();
  const unsubscribe = (await openTab()).subscribeWorkspaceInvalidation(listener);
  await flush();

  latestSource().emit("open");
  latestSource().emit("error");
  latestSource().emit("open");
  unsubscribe();

  expect(listener).toHaveBeenCalledOnce();
});

test("가려진 탭은 알림을 미뤘다가 다시 보일 때 한 번만 반영한다", async () => {
  const listener = vi.fn<() => void>();
  const unsubscribe = (await openTab()).subscribeWorkspaceInvalidation(listener);
  await flush();

  fakeDocument.setVisibility("hidden");
  latestSource().emit("invalidate");
  latestSource().emit("invalidate");
  expect(listener).not.toHaveBeenCalled();
  fakeDocument.setVisibility("visible");
  fakeDocument.setVisibility("hidden");
  fakeDocument.setVisibility("visible");
  unsubscribe();

  expect(listener).toHaveBeenCalledOnce();
});

test("연결을 주도하는 탭은 awaitFirstInvalidation을 첫 알림이 올 때까지 기다린다", async () => {
  const events = await openTab();
  events.subscribeWorkspaceInvalidation(() => {});
  await flush();

  latestSource().emit("open");
  let settled = false;
  void events.awaitFirstInvalidation().then(() => {
    settled = true;
  });
  expect(settled).toBe(false);

  latestSource().emit("invalidate");
  await flush();

  expect(settled).toBe(true);
});

test("다른 탭이 이미 연결 중이면 awaitFirstInvalidation은 기다리지 않는다", async () => {
  (await openTab()).subscribeWorkspaceInvalidation(() => {});
  await flush();
  latestSource().emit("open");

  const follower = await openTab();
  follower.subscribeWorkspaceInvalidation(() => {});
  const settled = vi.fn<() => void>();
  void follower.awaitFirstInvalidation().then(settled);
  await flush();

  expect(settled).toHaveBeenCalledOnce();
});

test("연결에 오류가 나면 awaitFirstInvalidation을 기다리던 조회를 푼다", async () => {
  const events = await openTab();
  events.subscribeWorkspaceInvalidation(() => {});
  await flush();
  latestSource().emit("open");

  const settled = vi.fn<() => void>();
  void events.awaitFirstInvalidation().then(settled);
  latestSource().emit("error");
  await flush();

  expect(settled).toHaveBeenCalledOnce();
});

test("다른 탭의 연결을 이어받으면 이어받은 연결의 첫 알림까지 awaitFirstInvalidation을 기다린다", async () => {
  const leader = await openTab();
  const stopLeader = leader.subscribeWorkspaceInvalidation(() => {});
  await flush();
  latestSource().emit("open");

  const taker = await openTab();
  taker.subscribeWorkspaceInvalidation(() => {});
  await flush();

  stopLeader();
  await flush();
  const settled = vi.fn<() => void>();
  void taker.awaitFirstInvalidation().then(settled);
  expect(settled).not.toHaveBeenCalled();

  latestSource().emit("open");
  await flush();
  expect(settled).toHaveBeenCalledOnce();
});
