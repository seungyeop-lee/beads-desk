/** 연결 탭이 감시하는 workspace와, 그중 이번 알림으로 바뀌었을 수 있는 workspace입니다. */
export type WatchedWorkspaceChange = { watched: readonly string[]; changed: readonly string[] };
type WatchListener = (change: WatchedWorkspaceChange) => void;

/** 이 탭이 연결을 주도하는 동안 그 연결이 감시하는 workspace입니다. 주도하지 않으면 비어 있습니다. */
let watched: readonly string[] = [];
const listeners = new Set<WatchListener>();

/**
 * 이 탭이 SSE 연결을 연 동안, 연결이 감시하는 모든 workspace의 변경을 listener에 알립니다. 연결 탭은 하나뿐이어서
 * 탭이 여러 개여도 변경 하나가 한 번만 전달됩니다. 다른 탭에서는 listener가 호출되지 않습니다.
 * `subscribeWorkspaceInvalidation`과 달리 탭이 가려졌는지 따지지 않고 바로 알립니다. 이 함수는 연결을 열지 않으므로
 * 그 함수의 구독자가 있는 동안만 알림이 옵니다.
 * 구독할 때와 감시 대상이 바뀔 때, 이 탭이 연결을 놓을 때는 changed를 비워 지금 감시하는 workspace를 알리므로,
 * listener는 watched 밖의 상태를 버릴 수 있습니다.
 */
export function subscribeWatchedWorkspaceChanges(listener: WatchListener): () => void {
  listeners.add(listener);
  listener({ watched, changed: [] });
  return () => listeners.delete(listener);
}

/** 연결이 감시할 workspace를 정하고 changed 없이 알립니다. 이 탭이 연결을 놓으면 비워 부릅니다. */
export function announceWatchedWorkspaces(workspaces: readonly string[]): void {
  announce(workspaces, []);
}

/** 받은 알림을 감시 대상에 비춰 알립니다. 어느 workspace의 변경인지 알 수 없으면 감시하는 모두가 바뀌었을 수 있습니다. */
export function announceChangedWorkspace(workspace: string | undefined): void {
  if (workspace === undefined) announce(watched, watched);
  else if (watched.includes(workspace)) announce(watched, [workspace]);
}

function announce(watchedAfter: readonly string[], changed: readonly string[]): void {
  watched = watchedAfter;
  for (const listener of listeners) listener({ watched: watchedAfter, changed });
}
