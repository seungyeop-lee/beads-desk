import type { ReactNode } from "react";
import { ErrorAlert } from "./ErrorAlert";

type ReadState<T> = {
  data: T | null;
  error: string | null;
};

type LoadResultProps<T> = {
  state: ReadState<T>;
  /** 조회가 실패했을 때 보일 문구입니다. */
  loadFailed: (error: string) => string;
  /** 데이터를 기다리는 동안 보일 표시입니다. */
  waiting: ReactNode;
  /** 데이터를 받으면 그립니다. */
  children: (data: T) => ReactNode;
};

/**
 * 조회 결과를 실패 알림, 기다림 표시, 본문 세 갈래로 보여 줍니다.
 * 다시 읽어 실패해도 마지막으로 받은 데이터를 유지하는 조회는 오류를 본문보다 먼저 보입니다.
 */
export function LoadResult<T>({ state, loadFailed, waiting, children }: LoadResultProps<T>) {
  if (state.error) {
    return <ErrorAlert>{loadFailed(state.error)}</ErrorAlert>;
  }
  if (state.data === null) {
    return <>{waiting}</>;
  }
  return <>{children(state.data)}</>;
}
