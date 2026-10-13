import { INVALIDATE_EVENT, WORKSPACE_EVENTS_PATH } from "@/shared/contract/workspaceEvents";

type Listener = () => void;

const listeners = new Set<Listener>();
let source: EventSource | null = null;

/**
 * workspace 데이터를 다시 조회해야 할 때 listener를 호출합니다. 탭 하나의 구독자는 SSE 연결 하나를 함께 씁니다.
 *
 * 가려진 탭은 연결을 닫습니다. 브라우저는 origin마다 동시 연결 수를 제한하므로 탭마다 연결을 열어 두면 다른 요청이 막힐 수 있고,
 * 가려진 탭이 변경마다 다시 조회하면 그만큼 bd 실행이 늘어납니다. 탭이 다시 보이면 그동안의 변경을 반영하도록 listener를 호출합니다.
 */
export function subscribeWorkspaceInvalidation(listener: Listener): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (document.visibilityState === "visible") connect();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      disconnect();
    }
  };
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") {
    connect();
    notify();
  } else {
    disconnect();
  }
}

function connect() {
  if (source) return;
  const opened = new EventSource(WORKSPACE_EVENTS_PATH);
  // EventSource는 연결이 끊기면 스스로 다시 연결합니다. 끊긴 동안 놓친 변경이 있을 수 있어 다시 연결되면 알립니다.
  let interrupted = false;
  opened.addEventListener("error", () => {
    interrupted = true;
  });
  opened.addEventListener("open", () => {
    if (interrupted) notify();
    interrupted = false;
  });
  opened.addEventListener(INVALIDATE_EVENT, notify);
  source = opened;
}

function disconnect() {
  source?.close();
  source = null;
}

function notify() {
  for (const listener of listeners) listener();
}
