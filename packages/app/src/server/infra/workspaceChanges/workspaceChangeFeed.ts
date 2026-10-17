import { openChangeFingerprint, type ChangeFingerprint } from "@beads-desk/bd";

type Listener = () => void;

type Feed = {
  listeners: Set<Listener>;
  timer: ReturnType<typeof setInterval>;
  fingerprint: ChangeFingerprint | null;
  last: string | null;
  /** 처음 조회를 마쳤는지입니다. 처음 조회는 DB 상태를 읽지 못해도 알립니다. 마친 뒤 구독하는 listener는 구독 직후 알림을 받습니다. */
  settled: boolean;
  /** 진행 중인 조회입니다. */
  polling: Promise<void> | null;
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
 * 구독하면 기준값을 읽은 뒤에도 한 번 호출합니다. listener가 기준값보다 먼저 조회한 데이터와 기준값 사이에 쓰기가
 * 있었다면 그 쓰기는 기준값에 포함되어 변경으로 잡히지 않기 때문입니다. 기준값을 읽지 못했어도 호출합니다.
 * 처음 만든 feed에서는 첫 조회가 끝날 때 그때까지 구독한 모든 listener에게 가고, 이미 기준값을 읽은 feed에
 * 구독하면 구독 직후 그 listener에게만 갑니다. 그래서 listener는 구독할 때마다 기준값 알림을 한 번 받습니다.
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
      settled: false,
      polling: null,
    };
    created.timer.unref();
    feeds().set(workspaceRoot, created);
    void poll(workspaceRoot, created);
    feed = created;
  }
  feed.listeners.add(listener);
  // 이미 기준값을 읽은 feed에 구독한 listener에게는 구독 직후 바로 알립니다. 그 listener가 구독 전에 조회한
  // 데이터는 기준값과 그 사이의 쓰기를 놓칠 수 있어서입니다. 기준값을 아직 읽지 않은 feed에서는 첫 조회가
  // 끝날 때 모든 listener에게 알리므로 여기서 알리지 않습니다.
  if (feed.settled) listener();

  const subscribed = feed;
  return () => {
    subscribed.listeners.delete(listener);
    if (subscribed.listeners.size === 0 && feeds().get(workspaceRoot) === subscribed) {
      clearInterval(subscribed.timer);
      feeds().delete(workspaceRoot);
    }
  };
}

/**
 * 다음 주기를 기다리지 않고 DB 상태를 확인해, 바뀌었으면 구독자에게 알립니다. 쓰기가 끝난 직후에 호출합니다.
 * 이 호출 뒤에 시작한 조회가 끝나야 돌려줍니다. 구독자가 없으면 아무것도 하지 않습니다.
 */
export async function checkWorkspaceChangesNow(workspaceRoot: string): Promise<void> {
  const feed = feeds().get(workspaceRoot);
  if (!feed) return;
  // 진행 중인 조회는 쓰기 전에 값을 읽었을 수 있으므로 끝나기를 기다렸다가 새로 읽습니다.
  await feed.polling;
  await poll(workspaceRoot, feed);
}

// server mode에서는 조회 한 번이 bd 실행이라 주기보다 오래 걸릴 수 있습니다. 진행 중이면 새로 시작하지 않고 그 조회를 돌려줍니다.
function poll(workspaceRoot: string, feed: Feed): Promise<void> {
  feed.polling ??= readFingerprint(workspaceRoot, feed).finally(() => {
    feed.polling = null;
  });
  return feed.polling;
}

async function readFingerprint(workspaceRoot: string, feed: Feed): Promise<void> {
  const current = await currentFingerprint(workspaceRoot, feed);
  const first = !feed.settled;
  feed.settled = true;
  if (first || (current !== null && current !== feed.last)) {
    for (const listener of feed.listeners) listener();
  }
  if (current !== null) feed.last = current;
}

/** DB 상태를 비교할 값을 읽습니다. 읽지 못하면 null을 돌려줍니다. */
async function currentFingerprint(workspaceRoot: string, feed: Feed): Promise<string | null> {
  if (!feed.fingerprint) {
    const opened = await openChangeFingerprint(workspaceRoot);
    if (!opened.ok) return null;
    feed.fingerprint = opened.value;
  }
  return feed.fingerprint();
}
