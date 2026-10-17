import {
  awaitFirstInvalidation,
  subscribeWorkspaceInvalidation,
} from "@/client/infra/workspaceEvents/workspaceEventSource";
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
      // 첫 조회는 연결을 주도하는 탭이 서버의 기준값 알림을 받은 뒤에 시작합니다. 그 전에 조회한 데이터는
      // 기준값과 그 사이의 쓰기를 놓쳐 다시 조회하게 되므로, 처음부터 알림 뒤에 읽어 두 번 조회하지 않게
      // 합니다. 기다리는 동안 온 알림은 이 조회가 덮으므로 다시 읽기로 이어지지 않고, do 반복문 첫머리에서
      // 표시가 지워집니다. 첫 알림을 받은 뒤에는 이 await가 바로 끝나 다시 읽기가 늦어지지 않습니다.
      await awaitFirstInvalidation();
      if (stopped) return;
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

  const unsubscribe = subscribeWorkspaceInvalidation(() => void load());
  void load();
  return () => {
    stopped = true;
    unsubscribe();
  };
}
