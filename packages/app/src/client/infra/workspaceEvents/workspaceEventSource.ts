import { INVALIDATE_EVENT, WORKSPACE_EVENTS_PATH } from "@/shared/contract/workspaceEvents";

type Listener = () => void;

// 브라우저는 HTTP/1.1에서 host마다 동시 연결을 6개까지만 엽니다. 탭마다 SSE를 열면 탭이 6개를 넘을 때 조회 요청이 막히므로,
// lock을 얻은 탭 하나만 SSE를 열고 받은 알림을 다른 탭에 BroadcastChannel로 전달합니다.
const CONNECTION_LOCK = "beads-desk.workspace-events";
const CHANNEL_NAME = "beads-desk.workspace-events";

const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;
let stopLeading: AbortController | null = null;
/** 가려진 동안 받은 알림이 있으면 true입니다. */
let stale = false;

/**
 * workspace 데이터를 다시 조회해야 할 때 listener를 호출합니다.
 * 가려진 탭은 알림을 모아 두었다가 다시 보일 때 한 번 호출해, 보이지 않는 화면 때문에 bd 실행이 늘지 않게 합니다.
 */
export function subscribeWorkspaceInvalidation(listener: Listener): () => void {
  listeners.add(listener);
  if (!channel) start();
  return () => {
    listeners.delete(listener);
    // 화면 조건이 바뀌면 React가 같은 시점에 구독을 해제했다가 다시 구독합니다. 그때 연결을 닫으면
    // 다시 여는 연결을 다른 탭에서 이어받은 것으로 보고 모든 탭이 다시 조회하므로, 다음 task까지 기다렸다가 닫습니다.
    setTimeout(() => {
      if (listeners.size === 0) stop();
    }, 0);
  };
}

function start() {
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.addEventListener("message", (event) => {
    if (event.data === INVALIDATE_EVENT) receive();
  });
  document.addEventListener("visibilitychange", onVisibilityChange);
  stopLeading = new AbortController();
  void leadConnection(stopLeading.signal);
}

function stop() {
  stopLeading?.abort();
  stopLeading = null;
  channel?.close();
  channel = null;
  document.removeEventListener("visibilitychange", onVisibilityChange);
  stale = false;
}

async function leadConnection(signal: AbortSignal) {
  try {
    const opened = await navigator.locks.request(CONNECTION_LOCK, { ifAvailable: true }, (lock) =>
      lock ? holdConnection(signal, false) : false,
    );
    // 다른 탭이 연결을 갖고 있으면 그 탭이 떠날 때까지 기다렸다가 이어받습니다.
    if (!opened) {
      await navigator.locks.request(CONNECTION_LOCK, { signal }, () =>
        holdConnection(signal, true),
      );
    }
  } catch {
    // stop()이 기다리던 lock 요청을 취소했습니다.
  }
}

/** SSE를 열고 signal이 취소될 때까지 유지합니다. 그동안 lock을 쥐고 있습니다. */
function holdConnection(signal: AbortSignal, tookOver: boolean): Promise<true> {
  return new Promise((release) => {
    if (signal.aborted) return release(true);
    const source = new EventSource(WORKSPACE_EVENTS_PATH);
    // 연결이 없던 동안의 변경은 알림을 받지 못했으므로 연결이 열리면 다시 조회하게 합니다.
    // 다른 탭에서 이어받았거나, 끊긴 연결을 EventSource가 스스로 다시 연결한 경우입니다.
    let missedChanges = tookOver;
    source.addEventListener("error", () => {
      missedChanges = true;
    });
    source.addEventListener("open", () => {
      if (missedChanges) broadcast();
      missedChanges = false;
    });
    source.addEventListener(INVALIDATE_EVENT, broadcast);
    signal.addEventListener(
      "abort",
      () => {
        source.close();
        release(true);
      },
      { once: true },
    );
  });
}

function broadcast() {
  channel?.postMessage(INVALIDATE_EVENT);
  receive();
}

function receive() {
  if (document.visibilityState === "visible") notify();
  else stale = true;
}

function onVisibilityChange() {
  if (document.visibilityState === "visible" && stale) {
    stale = false;
    notify();
  }
}

function notify() {
  for (const listener of listeners) listener();
}
