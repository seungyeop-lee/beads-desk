import { subscribeWorkspaceInvalidation } from "@/client/infra/workspaceEvents/workspaceEventSource";
import type { ApiResponse } from "@/shared/contract/apiResponse";

/**
 * read로 읽은 결과를 onResult로 넘기고, workspace가 바뀔 때마다 다시 읽습니다. 돌려준 함수를 호출하면 멈춥니다.
 * 읽는 중에 바뀌었다는 알림이 여러 번 와도, 읽기가 끝난 뒤 한 번만 다시 읽습니다.
 * 서버는 bd를 한 번에 하나씩 실행하므로 알림마다 읽으면 조회가 쌓여, 그 뒤에 줄 선 쓰기가 늦어집니다.
 */
export function watchWorkspaceRead<T>(
  read: () => Promise<ApiResponse<T>>,
  onResult: (result: ApiResponse<T>) => void,
): () => void {
  let reading = false;
  let changedWhileReading = false;
  let stopped = false;

  const load = async () => {
    if (reading) {
      changedWhileReading = true;
      return;
    }
    reading = true;
    try {
      do {
        changedWhileReading = false;
        const result = await read();
        if (stopped) return;
        onResult(result);
      } while (changedWhileReading);
    } finally {
      reading = false;
    }
  };

  void load();
  const unsubscribe = subscribeWorkspaceInvalidation(() => void load());
  return () => {
    stopped = true;
    unsubscribe();
  };
}
