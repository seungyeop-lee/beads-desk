import type { InvalidationOptions } from "@/client/infra/workspaceEvents/workspaceEventSource";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import type { WorkspaceReadState } from "./useWorkspaceRead";
import { watchWorkspaceRead } from "./watchWorkspaceRead";

/** `useSyncExternalStore`에 그대로 넘기는 구독 함수와 결과입니다. 서버에서 렌더링할 때는 아직 읽지 않은 상태로 보입니다. */
export type SharedWorkspaceRead<T> = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => WorkspaceReadState<T>;
  getServerSnapshot: () => WorkspaceReadState<T>;
};

const NOT_LOADED = { data: null, error: null, loading: true } as const;

/**
 * 같은 데이터를 여러 component가 보여도 workspace가 바뀔 때 read를 한 번만 호출하도록, 구독자끼리 결과를 나눠 씁니다.
 * 첫 구독자가 생기면 읽기 시작하고, 마지막 구독자가 떠나면 멈추고 결과를 버립니다.
 * 다시 읽다 실패하면 마지막으로 받은 데이터를 유지합니다.
 */
export function shareWorkspaceRead<T>(
  read: () => Promise<ApiResponse<T>>,
  options?: InvalidationOptions,
): SharedWorkspaceRead<T> {
  const listeners = new Set<() => void>();
  let state: WorkspaceReadState<T> = NOT_LOADED;
  let stop: (() => void) | null = null;

  const publish = (result: ApiResponse<T>) => {
    state = result.ok
      ? { data: result.data, error: null, loading: false }
      : { data: state.data, error: result.error, loading: false };
    for (const listener of listeners) listener();
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      stop ??= watchWorkspaceRead(read, publish, options);
      return () => {
        listeners.delete(listener);
        if (listeners.size > 0 || !stop) return;
        stop();
        stop = null;
        state = NOT_LOADED;
      };
    },
    getSnapshot: () => state,
    getServerSnapshot: () => NOT_LOADED,
  };
}
