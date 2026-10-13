import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { subscribeWorkspaceInvalidation } from "./workspaceEventSource";

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

class FakeDocument extends EventTarget {
  visibilityState: DocumentVisibilityState = "visible";

  setVisibility(state: DocumentVisibilityState) {
    this.visibilityState = state;
    this.dispatchEvent(new Event("visibilitychange"));
  }
}

let fakeDocument: FakeDocument;
const latestSource = () => FakeEventSource.instances.at(-1)!;

beforeEach(() => {
  FakeEventSource.instances = [];
  fakeDocument = new FakeDocument();
  vi.stubGlobal("EventSource", FakeEventSource);
  vi.stubGlobal("document", fakeDocument);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("invalidate 이벤트를 받으면 구독자에게 알린다", () => {
  const listener = vi.fn<() => void>();
  const unsubscribe = subscribeWorkspaceInvalidation(listener);

  latestSource().emit("open");
  latestSource().emit("invalidate");
  unsubscribe();

  expect(latestSource().url).toBe("/api/events");
  expect(listener).toHaveBeenCalledOnce();
});

test("여러 구독자가 연결 하나를 함께 쓴다", () => {
  const first = subscribeWorkspaceInvalidation(() => {});
  const second = subscribeWorkspaceInvalidation(() => {});

  expect(FakeEventSource.instances).toHaveLength(1);
  first();
  expect(latestSource().closed).toBe(false);
  second();
  expect(latestSource().closed).toBe(true);
});

test("끊겼다가 다시 연결되면 놓친 변경이 있을 수 있어 구독자에게 알린다", () => {
  const listener = vi.fn<() => void>();
  const unsubscribe = subscribeWorkspaceInvalidation(listener);

  latestSource().emit("open");
  latestSource().emit("error");
  latestSource().emit("open");
  unsubscribe();

  expect(listener).toHaveBeenCalledOnce();
});

test("탭이 가려지면 연결을 닫고, 다시 보이면 연결한 뒤 구독자에게 알린다", () => {
  const listener = vi.fn<() => void>();
  const unsubscribe = subscribeWorkspaceInvalidation(listener);
  const hiddenSource = latestSource();

  fakeDocument.setVisibility("hidden");
  expect(hiddenSource.closed).toBe(true);
  expect(listener).not.toHaveBeenCalled();

  fakeDocument.setVisibility("visible");
  unsubscribe();

  expect(FakeEventSource.instances).toHaveLength(2);
  expect(listener).toHaveBeenCalledOnce();
});

test("가려진 탭에서 구독을 시작하면 보일 때까지 연결하지 않는다", () => {
  fakeDocument.visibilityState = "hidden";
  const unsubscribe = subscribeWorkspaceInvalidation(() => {});

  expect(FakeEventSource.instances).toHaveLength(0);
  unsubscribe();
});
