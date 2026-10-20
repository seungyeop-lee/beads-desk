import { documentWorkspace } from "@/client/infra/workspaces/documentWorkspace";
import {
  INVALIDATE_EVENT,
  type InvalidateNotice,
  workspaceEventsUrl,
} from "@/shared/contract/workspaceEvents";

type Listener = () => void;

/** 탭 사이에 주고받는 메시지입니다. views-changed는 어느 탭이 새 workspace를 보기 시작했다는 뜻입니다. */
type ChannelMessage = { type: "invalidate"; notice: InvalidateNotice } | { type: "views-changed" };

// 브라우저는 HTTP/1.1에서 host마다 동시 연결을 6개까지만 엽니다. 탭마다 SSE를 열면 탭이 6개를 넘을 때 조회 요청이 막히므로,
// lock을 얻은 탭 하나만 SSE를 열고 받은 알림을 다른 탭에 BroadcastChannel로 전달합니다.
const CONNECTION_LOCK = "beads-desk.workspace-events";
const CHANNEL_NAME = "beads-desk.workspace-events";
// 탭마다 보는 workspace를 이 이름으로 시작하는 shared lock으로 쥐고 있습니다. 연결을 연 탭은 lock 목록에서 감시할
// workspace를 모아 연결 하나로 함께 감시합니다. 탭이 닫히면 브라우저가 lock을 풀므로 탭 목록을 따로 관리하지 않습니다.
const VIEW_LOCK_PREFIX = "beads-desk.workspace-view:";

const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;
let stopLeading: AbortController | null = null;
/** 이 탭이 보는 workspace의 이름입니다. 구독자가 없으면 null입니다. */
let viewed: string | null = null;
let releaseView: AbortController | null = null;
/** 이 탭이 연결을 주도하는 동안, 감시할 workspace가 바뀌었는지 보고 바뀌었으면 다시 연결합니다. */
let refreshConnection: (() => void) | null = null;
/** 가려진 동안 받은 알림이 있으면 true입니다. */
let stale = false;
/** 이 탭이 SSE 연결을 열어 주도하는 중인지입니다. 아직 lock을 얻을지 정해지지 않았으면 null입니다. */
let leading: boolean | null = null;
/** leading이 정해지기를 기다리는 promise입니다. start()마다 다시 만듭니다. */
let leadingDecided: PromiseWithResolvers<void> = Promise.withResolvers();
/** 지금 연결에서 이 탭의 workspace에 대한 첫 알림을 기다리는 promise입니다. 연결을 열 때마다 다시 만듭니다. */
let initialNotice: PromiseWithResolvers<void> = Promise.withResolvers();

/**
 * 이 탭이 보는 workspace의 데이터를 다시 조회해야 할 때 listener를 호출합니다. 다른 workspace의 변경은 알리지 않습니다.
 * 가려진 탭은 알림을 모아 두었다가 다시 보일 때 한 번 호출해, 보이지 않는 화면 때문에 bd 실행이 늘지 않게 합니다.
 */
export function subscribeWorkspaceInvalidation(listener: Listener): () => void {
  listeners.add(listener);
  if (!channel) start();
  // 같은 탭에서 다른 workspace 주소로 이동하면 화면이 구독을 해제했다가 바로 다시 구독하므로, 구독할 때마다 주소를 다시 봅니다.
  view(documentWorkspace());
  return () => {
    listeners.delete(listener);
    // 화면 조건이 바뀌면 React가 같은 시점에 구독을 해제했다가 다시 구독합니다. 그때 연결을 닫으면
    // 다시 여는 연결을 다른 탭에서 이어받은 것으로 보고 모든 탭이 다시 조회하므로, 다음 task까지 기다렸다가 닫습니다.
    setTimeout(() => {
      if (listeners.size === 0) stop();
    }, 0);
  };
}

/**
 * 이 탭이 SSE 연결을 열게 되면 서버가 변경 감시의 기준값을 읽은 뒤 보내는 첫 알림을 기다립니다.
 * 기준값을 읽기 전에 조회한 데이터는 그 사이의 쓰기를 놓칠 수 있어서입니다. 서버는 새 연결마다 workspace별로
 * 기준값 알림을 한 번 보내므로 이 promise는 반드시 끝나고, 연결에 오류가 나면 조회를 계속 미루지 않도록 바로 끝냅니다.
 * 다른 탭이 이미 연결을 열었으면 기다리지 않습니다. 이 탭의 workspace를 그 연결이 아직 감시하지 않았다면,
 * 감시를 시작할 때 오는 기준값 알림으로 한 번 더 조회합니다.
 */
export async function awaitFirstInvalidation(): Promise<void> {
  await leadingDecided.promise;
  if (leading !== true) return;
  await initialNotice.promise;
}

function start() {
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.addEventListener("message", (event: MessageEvent<ChannelMessage>) => {
    if (event.data.type === "invalidate") receive(event.data.notice);
    else refreshConnection?.();
  });
  document.addEventListener("visibilitychange", onVisibilityChange);
  stopLeading = new AbortController();
  leading = null;
  leadingDecided = Promise.withResolvers();
  void leadConnection(stopLeading.signal);
}

function stop() {
  stopLeading?.abort();
  stopLeading = null;
  channel?.close();
  channel = null;
  document.removeEventListener("visibilitychange", onVisibilityChange);
  view(null);
  stale = false;
  leading = false;
}

/** 이 탭이 보는 workspace를 lock으로 표시하고, 새로 보기 시작했으면 연결을 연 탭이 감시 대상에 넣게 합니다. */
function view(workspace: string | null) {
  if (workspace === viewed) return;
  viewed = workspace;
  releaseView?.abort();
  releaseView = null;
  if (workspace === null) return;
  const release = new AbortController();
  releaseView = release;
  navigator.locks
    .request(VIEW_LOCK_PREFIX + workspace, { mode: "shared", signal: release.signal }, () => {
      channel?.postMessage({ type: "views-changed" } satisfies ChannelMessage);
      refreshConnection?.();
      return new Promise<void>((resolve) =>
        release.signal.addEventListener("abort", () => resolve(), { once: true }),
      );
    })
    // lock을 얻기 전에 다른 workspace로 옮겨 가 요청을 취소했습니다.
    .catch(() => {});
}

async function leadConnection(signal: AbortSignal) {
  try {
    const opened = await navigator.locks.request(CONNECTION_LOCK, { ifAvailable: true }, (lock) => {
      leading = lock !== null;
      leadingDecided.resolve();
      return lock ? holdConnection(signal, false) : false;
    });
    // 다른 탭이 연결을 갖고 있으면 그 탭이 떠날 때까지 기다렸다가 이어받습니다.
    if (!opened) {
      await navigator.locks.request(CONNECTION_LOCK, { signal }, (lock) => {
        leading = lock !== null;
        leadingDecided.resolve();
        return holdConnection(signal, true);
      });
    }
  } catch {
    // stop()이 기다리던 lock 요청을 취소했습니다.
  }
}

/**
 * 탭들이 보는 workspace를 모두 감시하는 SSE를 열고 signal이 취소될 때까지 유지합니다. 그동안 lock을 쥐고 있습니다.
 * 어느 탭이 새 workspace를 보기 시작하면 그 workspace까지 감시하도록 다시 연결합니다. 새 연결은 workspace마다
 * 기준값 알림을 보내 모든 탭이 한 번씩 다시 조회합니다. 탭이 닫혀 보지 않게 된 workspace는 다음에 다시 연결할 때 뺍니다.
 */
function holdConnection(signal: AbortSignal, tookOver: boolean): Promise<true> {
  const firstNotice = Promise.withResolvers<void>();
  initialNotice = firstNotice;
  return new Promise((release) => {
    if (signal.aborted) return release(true);
    let source: EventSource | null = null;
    let watched: string[] | null = null;
    // 연결이 없던 동안의 변경은 알림을 받지 못했으므로 연결이 열리면 다시 조회하게 합니다.
    // 다른 탭에서 이어받았거나, 끊긴 연결을 EventSource가 스스로 다시 연결한 경우입니다.
    let missedChanges = tookOver;

    const connect = (workspaces: string[], notice: PromiseWithResolvers<void>) => {
      source?.close();
      // 이전 연결의 첫 알림을 기다리던 조회는 새 연결의 기준값 알림으로 다시 조회하므로 풀어 줍니다.
      if (initialNotice !== notice) initialNotice.resolve();
      initialNotice = notice;
      watched = workspaces;
      const opened = new EventSource(workspaceEventsUrl(workspaces));
      source = opened;
      opened.addEventListener("error", () => {
        missedChanges = true;
        // 연결이 열리지 않으면 첫 조회를 끝없이 미루지 않도록 기다리던 조회를 풀어 줍니다.
        notice.resolve();
      });
      opened.addEventListener("open", () => {
        if (missedChanges) broadcast({});
        missedChanges = false;
      });
      opened.addEventListener(INVALIDATE_EVENT, (event) => broadcast(readNotice(event)));
    };
    const refresh = (notice: PromiseWithResolvers<void>) =>
      void watchedWorkspaces().then((workspaces) => {
        if (signal.aborted || (watched && sameWorkspaces(watched, workspaces))) return;
        connect(workspaces, notice);
      });

    refreshConnection = () => refresh(Promise.withResolvers());
    refresh(firstNotice);
    signal.addEventListener(
      "abort",
      () => {
        refreshConnection = null;
        source?.close();
        initialNotice.resolve();
        release(true);
      },
      { once: true },
    );
  });
}

/** lock으로 표시한 탭들의 workspace와 이 탭의 workspace입니다. 순서를 정해 두어 바뀌었는지 비교합니다. */
async function watchedWorkspaces(): Promise<string[]> {
  const { held = [] } = await navigator.locks.query();
  const workspaces = new Set(viewed === null ? [] : [viewed]);
  for (const { name } of held) {
    if (name?.startsWith(VIEW_LOCK_PREFIX)) workspaces.add(name.slice(VIEW_LOCK_PREFIX.length));
  }
  return [...workspaces].sort();
}

function sameWorkspaces(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((workspace, index) => workspace === b[index]);
}

/** data를 해석하지 못하면 어느 workspace의 변경인지 모르므로 모든 탭이 다시 조회하게 합니다. */
function readNotice(event: Event): InvalidateNotice {
  try {
    const notice: unknown = JSON.parse(String((event as MessageEvent).data));
    if (typeof notice === "object" && notice !== null) {
      const { workspace } = notice as Record<string, unknown>;
      if (typeof workspace === "string") return { workspace };
    }
  } catch {
    // 아래의 모든 탭 알림으로 처리합니다.
  }
  return {};
}

function broadcast(notice: InvalidateNotice) {
  if (concernsThisTab(notice)) initialNotice.resolve();
  channel?.postMessage({ type: "invalidate", notice } satisfies ChannelMessage);
  receive(notice);
}

function concernsThisTab(notice: InvalidateNotice): boolean {
  return notice.workspace === undefined || notice.workspace === viewed;
}

function receive(notice: InvalidateNotice) {
  if (!concernsThisTab(notice)) return;
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
