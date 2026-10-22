import { useSyncExternalStore } from "react";
import type { SharedWorkspaceRead } from "./shareWorkspaceRead";
import type { WorkspaceReadState } from "./useWorkspaceRead";

/** 나눠 쓰는 조회 결과를 React 화면에 연결합니다. */
export function useSharedWorkspaceRead<T>(read: SharedWorkspaceRead<T>): WorkspaceReadState<T> {
  return useSyncExternalStore(read.subscribe, read.getSnapshot, read.getServerSnapshot);
}
