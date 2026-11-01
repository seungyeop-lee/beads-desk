import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { WatchedWorkspaceChange } from "./workspaceEventSource";

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

  emit(type: string, data?: unknown) {
    this.dispatchEvent(
      data === undefined ? new Event(type) : new MessageEvent(type, { data: JSON.stringify(data) }),
    );
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

/** 탭들이 함께 쓰는 Web Locks API입니다. shared lock은 서로 막지 않고, exclusive lock은 이름마다 하나씩 쥡니다. */
class FakeLocks {
  private held: { name: string; mode: LockMode }[] = [];
  private waiting = new Map<string, (() => void)[]>();

  async request(
    name: string,
    options: { ifAvailable?: boolean; signal?: AbortSignal; mode?: LockMode },
    callback: (lock: object | null) => unknown,
  ) {
    const mode = options.mode ?? "exclusive";
    const busy = () => mode === "exclusive" && this.held.some((lock) => lock.name === name);
    if (options.ifAvailable && busy()) return callback(null);
    while (busy()) {
      await new Promise<void>((resolve, reject) => {
        const queue = this.waiting.get(name) ?? [];
        this.waiting.set(name, [...queue, resolve]);
        options.signal?.addEventListener("abort", () => {
          this.waiting.set(
            name,
            (this.waiting.get(name) ?? []).filter((w) => w !== resolve),
          );
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    }
    const lock = { name, mode };
    this.held.push(lock);
    try {
      return await callback({});
    } finally {
      this.held = this.held.filter((other) => other !== lock);
      const queue = this.waiting.get(name) ?? [];
      queue.shift()?.();
    }
  }

  async query() {
    return { held: this.held.map(({ name, mode }) => ({ name, mode })) };
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

/**
 * 탭 하나의 module 상태를 따로 갖도록 매번 새로 불러옵니다. 탭이 보는 workspace는 구독할 때 주소에서 읽으므로,
 * 돌려준 탭의 subscribe는 그 탭의 주소로 바꾼 뒤 구독합니다.
 */
async function openTab(workspace = "a"): Promise<WorkspaceEvents> {
  vi.resetModules();
  const events = await import("./workspaceEventSource");
  return {
    ...events,
    subscribeWorkspaceInvalidation: (listener, options) => {
      vi.stubGlobal("location", { pathname: `/w/${workspace}/issues` });
      return events.subscribeWorkspaceInvalidation(listener, options);
    },
  };
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

  expect(latestSource().url).toBe("/api/events?workspace=a");
  expect(listener).toHaveBeenCalledOnce();
  expect(latestSource().closed).toBe(true);
});

test("다른 workspace의 변경은 알리지 않고, 이 탭의 workspace 변경과 목록 변경만 알린다", async () => {
  const listener = vi.fn<() => void>();
  const unsubscribe = (await openTab("a")).subscribeWorkspaceInvalidation(listener);
  await flush();

  latestSource().emit("open");
  latestSource().emit("invalidate", { workspace: "b" });
  expect(listener).not.toHaveBeenCalled();
  latestSource().emit("invalidate", { workspace: "a" });
  latestSource().emit("invalidate", {});
  unsubscribe();

  expect(listener).toHaveBeenCalledTimes(2);
});

test("서로 다른 workspace를 보는 탭들이 연결 하나로 모든 workspace를 감시한다", async () => {
  const first = vi.fn<() => void>();
  const second = vi.fn<() => void>();
  const stopFirst = (await openTab("a")).subscribeWorkspaceInvalidation(first);
  await flush();
  const firstSource = latestSource();
  const stopSecond = (await openTab("b")).subscribeWorkspaceInvalidation(second);
  await flush();
  await flush();

  latestSource().emit("open");
  latestSource().emit("invalidate", { workspace: "b" });
  const open = FakeEventSource.instances.filter((source) => !source.closed);
  stopFirst();
  stopSecond();

  expect(firstSource.url).toBe("/api/events?workspace=a");
  expect(firstSource.closed).toBe(true);
  expect(open.map((source) => source.url)).toEqual(["/api/events?workspace=a&workspace=b"]);
  expect([first.mock.calls.length, second.mock.calls.length]).toEqual([0, 1]);
});

test("같은 workspace를 보는 탭이 늘어도 다시 연결하지 않는다", async () => {
  const stopFirst = (await openTab("a")).subscribeWorkspaceInvalidation(() => {});
  await flush();
  const stopSecond = (await openTab("a")).subscribeWorkspaceInvalidation(() => {});
  await flush();
  await flush();

  const sources = FakeEventSource.instances.length;
  stopFirst();
  stopSecond();

  expect(sources).toBe(1);
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

test("whileHidden으로 구독하면 가려진 탭에서도 알림마다 바로 반영하고, 다시 보일 때는 그 구독만 다시 알리지 않는다", async () => {
  const events = await openTab();
  const whileHidden = vi.fn<() => void>();
  const deferred = vi.fn<() => void>();
  const stopWhileHidden = events.subscribeWorkspaceInvalidation(whileHidden, { whileHidden: true });
  const stopDeferred = events.subscribeWorkspaceInvalidation(deferred);
  await flush();

  fakeDocument.setVisibility("hidden");
  latestSource().emit("invalidate");
  latestSource().emit("invalidate");
  const whileHiddenCalls = whileHidden.mock.calls.length;
  const deferredCalls = deferred.mock.calls.length;
  fakeDocument.setVisibility("visible");
  stopWhileHidden();
  stopDeferred();

  expect([whileHiddenCalls, deferredCalls]).toEqual([2, 0]);
  expect([whileHidden.mock.calls.length, deferred.mock.calls.length]).toEqual([2, 1]);
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

test("awaitFirstInvalidation은 다른 workspace의 알림으로 끝나지 않는다", async () => {
  const events = await openTab("a");
  events.subscribeWorkspaceInvalidation(() => {});
  await flush();
  latestSource().emit("open");

  const settled = vi.fn<() => void>();
  void events.awaitFirstInvalidation().then(settled);
  latestSource().emit("invalidate", { workspace: "b" });
  await flush();
  expect(settled).not.toHaveBeenCalled();

  latestSource().emit("invalidate", { workspace: "a" });
  await flush();
  expect(settled).toHaveBeenCalledOnce();
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

test("연결을 연 탭은 가려져 있어도 감시하는 모든 workspace의 변경을 바로 받고, 다른 탭은 받지 않는다", async () => {
  const leader = await openTab("a");
  const stopLeader = leader.subscribeWorkspaceInvalidation(() => {});
  const leaderChanges = vi.fn<(change: WatchedWorkspaceChange) => void>();
  const stopLeaderChanges = leader.subscribeWatchedWorkspaceChanges(leaderChanges);
  await flush();
  const follower = await openTab("b");
  const stopFollower = follower.subscribeWorkspaceInvalidation(() => {});
  const followerChanges = vi.fn<(change: WatchedWorkspaceChange) => void>();
  const stopFollowerChanges = follower.subscribeWatchedWorkspaceChanges(followerChanges);
  await flush();
  await flush();

  fakeDocument.setVisibility("hidden");
  latestSource().emit("open");
  leaderChanges.mockClear();
  latestSource().emit("invalidate", { workspace: "b" });
  latestSource().emit("invalidate", {});
  latestSource().emit("invalidate", { workspace: "c" });
  stopLeaderChanges();
  stopFollowerChanges();
  stopLeader();
  stopFollower();

  expect(leaderChanges.mock.calls).toEqual([
    [{ watched: ["a", "b"], changed: ["b"] }],
    [{ watched: ["a", "b"], changed: ["a", "b"] }],
  ]);
  expect(followerChanges.mock.calls).toEqual([[{ watched: [], changed: [] }]]);
});

test("구독하면 지금 감시하는 workspace를 알리고, 연결을 놓으면 감시하는 workspace가 없다고 알린다", async () => {
  const events = await openTab("a");
  const stop = events.subscribeWorkspaceInvalidation(() => {});
  const changes = vi.fn<(change: WatchedWorkspaceChange) => void>();
  events.subscribeWatchedWorkspaceChanges(changes);
  await flush();

  stop();
  await flush();

  expect(changes.mock.calls).toEqual([
    [{ watched: [], changed: [] }],
    [{ watched: ["a"], changed: [] }],
    [{ watched: [], changed: [] }],
  ]);
});
