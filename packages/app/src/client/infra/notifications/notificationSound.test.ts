import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { playNotificationSound } from "./notificationSound";

/** 브라우저가 소리를 허용하는지 정해 두는 AudioContext입니다. 막으면 실제 브라우저처럼 resume이 끝나지 않습니다. */
class FakeAudioContext {
  static allowed = true;
  static created: FakeAudioContext[] = [];
  state: AudioContextState = "suspended";
  currentTime = 0;
  destination = {};
  started: OscillatorNode[] = [];
  closed = false;

  constructor() {
    FakeAudioContext.created.push(this);
  }

  resume() {
    if (!FakeAudioContext.allowed) return new Promise<void>(() => {});
    this.state = "running";
    return Promise.resolve();
  }

  close() {
    this.closed = true;
    this.state = "closed";
    return Promise.resolve();
  }

  createGain() {
    const param = {
      setValueAtTime() {},
      linearRampToValueAtTime() {},
      exponentialRampToValueAtTime() {},
    };
    return { gain: param, connect: (node: unknown) => node };
  }

  createOscillator() {
    const oscillator = Object.assign(new EventTarget(), {
      frequency: { value: 0 },
      connect: (node: unknown) => node,
      start: () => this.started.push(oscillator as unknown as OscillatorNode),
      stop() {},
    });
    return oscillator;
  }
}

beforeEach(() => {
  FakeAudioContext.allowed = true;
  FakeAudioContext.created = [];
  vi.stubGlobal("AudioContext", FakeAudioContext);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("브라우저가 소리를 허용하면 알림음을 재생하고, 재생이 끝나면 AudioContext를 닫는다", async () => {
  await expect(playNotificationSound()).resolves.toBe(true);

  const context = FakeAudioContext.created[0]!;
  expect(context.started.length).toBeGreaterThan(0);
  expect(context.closed).toBe(false);
  context.started.at(-1)!.dispatchEvent(new Event("ended"));
  expect(context.closed).toBe(true);
});

test("브라우저가 소리를 막으면 오류 없이 재생하지 않고, 나중에 소리가 나지 않도록 AudioContext를 닫는다", async () => {
  vi.useFakeTimers();
  FakeAudioContext.allowed = false;

  const played = playNotificationSound();
  await vi.runAllTimersAsync();

  await expect(played).resolves.toBe(false);
  const context = FakeAudioContext.created[0]!;
  expect(context.started).toEqual([]);
  expect(context.closed).toBe(true);
});

test("Web Audio를 지원하지 않는 브라우저에서는 오류 없이 재생하지 않는다", async () => {
  vi.stubGlobal("AudioContext", undefined);

  await expect(playNotificationSound()).resolves.toBe(false);
});
