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
        (result) => setLoaded((previous) => loadedAfterRead(previous, key, result)),
      ),
    [key, read],
  );

  return workspaceReadState(loaded, key);
}

/** 다시 읽다 실패하면 같은 key의 마지막 데이터를 유지해, 잠깐의 bd 오류로 화면이 비지 않게 합니다. */
export function loadedAfterRead<K, T>(
  previous: Loaded<K, T>,
  key: K,
  result: ApiResponse<T>,
): Loaded<K, T> {
  if (result.ok) return { key, data: result.data, error: null };
  return { key, data: Object.is(previous.key, key) ? previous.data : null, error: result.error };
}

/** 지금 key가 아닌 결과는 보이지 않습니다. */
export function workspaceReadState<K, T>(loaded: Loaded<K, T>, key: K): WorkspaceReadState<T> {
  const current = Object.is(loaded.key, key);
  return {
    data: current ? loaded.data : null,
    error: current ? loaded.error : null,
    loading: !current || (loaded.data === null && loaded.error === null),
  };
}
