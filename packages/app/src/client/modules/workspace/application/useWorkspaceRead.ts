import { useEffect, useState } from "react";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import { watchWorkspaceRead } from "./watchWorkspaceRead";

export type WorkspaceReadState<T> = {
  /** 아직 한 번도 받지 못했으면 null입니다. 다시 읽다 실패하면 마지막으로 받은 데이터를 유지합니다. */
  data: T | null;
  error: string | null;
  /** key를 바꾼 뒤 새 데이터를 아직 받지 못한 상태입니다. */
  loading: boolean;
};

type Loaded<K, T> = { key: K; data: T | null; error: string | null };

/**
 * key로 읽은 데이터를 돌려주고, workspace가 바뀔 때마다 다시 읽습니다.
 * key가 바뀌면 다시 구독하므로 객체 key는 렌더링마다 새로 만들지 말고 state로 유지해 넘깁니다.
 * read는 module 수준 함수처럼 바뀌지 않는 함수를 넘깁니다.
 */
export function useWorkspaceRead<K, T>(
  key: K,
  read: (key: K) => Promise<ApiResponse<T>>,
): WorkspaceReadState<T> {
  const [loaded, setLoaded] = useState<Loaded<K, T>>({ key, data: null, error: null });

  useEffect(
    () =>
      watchWorkspaceRead(
        () => read(key),
        (result) =>
          setLoaded((previous) =>
            result.ok
              ? { key, data: result.data, error: null }
              : {
                  key,
                  data: Object.is(previous.key, key) ? previous.data : null,
                  error: result.error,
                },
          ),
      ),
    [key, read],
  );

  const current = Object.is(loaded.key, key);
  return {
    data: current ? loaded.data : null,
    error: current ? loaded.error : null,
    loading: !current || (loaded.data === null && loaded.error === null),
  };
}
