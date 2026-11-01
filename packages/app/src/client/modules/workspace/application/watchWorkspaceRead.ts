import {
  awaitFirstInvalidation,
  type InvalidationOptions,
  subscribeWorkspaceInvalidation,
} from "@/client/infra/workspaceEvents/workspaceEventSource";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { createReadCoalescer } from "./readCoalescer";

/**
 * read로 읽은 결과를 onResult로 넘기고, workspace가 바뀔 때마다 다시 읽습니다. 돌려준 함수를 호출하면 멈춥니다.
 * 읽는 중에 바뀌었다는 알림이 여러 번 와도, 읽기가 끝난 뒤 한 번만 다시 읽습니다.
 */
export function watchWorkspaceRead<T>(
  read: () => Promise<ApiResponse<T>>,
  onResult: (result: ApiResponse<T>) => void,
  options?: InvalidationOptions,
): () => void {
  const coalescer = createReadCoalescer();
  let stopped = false;
  // 첫 조회는 첫 알림을 기다렸다 시작해 두 번 조회하지 않게 합니다. 기다리는 동안 온 알림은 첫 조회가
  // 덮으므로 다시 읽기로 이어지지 않습니다. 첫 알림을 받은 뒤에는 기다림이 바로 끝나 다시 읽기가 늦어지지 않습니다.
  let waitingFirstNotice = true;

  const readOnce = async (): Promise<boolean> => {
    if (stopped) return false;
    const result = await read();
    if (stopped) return false;
    onResult(result);
    return true;
  };

  const unsubscribe = subscribeWorkspaceInvalidation(() => {
    if (!waitingFirstNotice) void coalescer.run(readOnce);
  }, options);

  void (async () => {
    await awaitFirstInvalidation();
    waitingFirstNotice = false;
    if (!stopped) coalescer.run(readOnce);
  })();

  return () => {
    stopped = true;
    unsubscribe();
  };
}
