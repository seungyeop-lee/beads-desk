import { openChangeFingerprint, type ChangeFingerprint } from "@beads-desk/bd";

type Listener = () => void;

type Feed = {
  listeners: Set<Listener>;
  timer: ReturnType<typeof setInterval>;
  fingerprint: ChangeFingerprint | null;
  last: string | null;
  polling: boolean;
};

const DEFAULT_POLL_INTERVAL_MS = 2_000;

// route handler마다 module 사본이 따로 생기므로, 같은 workspace의 구독자가 조회를 하나만 공유하도록 process 전역에 둡니다.
const FEEDS_KEY = Symbol.for("beads-desk.workspaceChangeFeeds");

function feeds(): Map<string, Feed> {
  const holder = globalThis as { [FEEDS_KEY]?: Map<string, Feed> };
  holder[FEEDS_KEY] ??= new Map();
  return holder[FEEDS_KEY];
}

/**
 * workspace DB에 쓰기가 일어나면 listener를 호출합니다. bd 바깥(CLI 등)에서 일어난 쓰기도 포함합니다.
 * 구독자가 있는 동안에만 DB 상태를 주기적으로 읽고, 마지막 구독자가 떠나면 멈춥니다.
 *
 * 처음 구독하면 비교할 기준값을 읽은 뒤에도 한 번 호출합니다. 구독자가 그 전에 조회한 데이터와 기준값 사이에 쓰기가 있었다면
 * 그 쓰기는 기준값에 포함되어 변경으로 잡히지 않기 때문입니다.
 */
export function subscribeWorkspaceChanges(
  workspaceRoot: string,
  listener: Listener,
  options: { pollIntervalMs?: number } = {},
): () => void {
  let feed = feeds().get(workspaceRoot);
  if (!feed) {
    const created: Feed = {
      listeners: new Set(),
      timer: setInterval(
        () => void poll(workspaceRoot, created),
        options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
      ),
      fingerprint: null,
      last: null,
      polling: false,
    };
    created.timer.unref();
    feeds().set(workspaceRoot, created);
    void poll(workspaceRoot, created);
    feed = created;
  }
  feed.listeners.add(listener);

  const subscribed = feed;
  return () => {
    subscribed.listeners.delete(listener);
    if (subscribed.listeners.size === 0 && feeds().get(workspaceRoot) === subscribed) {
      clearInterval(subscribed.timer);
      feeds().delete(workspaceRoot);
    }
  };
}

async function poll(workspaceRoot: string, feed: Feed): Promise<void> {
  // server mode에서는 조회 한 번이 bd 실행이라 주기보다 오래 걸릴 수 있습니다. 겹쳐 실행하지 않습니다.
  if (feed.polling) return;
  feed.polling = true;
  try {
    if (!feed.fingerprint) {
      const opened = await openChangeFingerprint(workspaceRoot);
      if (!opened.ok) return;
      feed.fingerprint = opened.value;
    }
    const current = await feed.fingerprint();
    if (current === null) return;
    if (current !== feed.last) {
      for (const listener of feed.listeners) listener();
    }
    feed.last = current;
  } finally {
    feed.polling = false;
  }
}
