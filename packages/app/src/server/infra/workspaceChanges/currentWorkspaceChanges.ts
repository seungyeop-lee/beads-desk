import { currentWorkspaceRoot, onWorkspacesChanged } from "@/server/infra/runtime/serverRuntime";
import { subscribeWorkspaceChanges } from "./workspaceChangeFeed";

/**
 * 현재 workspace의 DB 변경을 구독합니다. 현재 workspace가 바뀌면 새 workspace를 구독합니다.
 * workspace 목록이나 현재 workspace가 바뀌어도 listener를 호출해, 화면이 workspace 선택과 데이터를 다시 읽게 합니다.
 */
export function subscribeCurrentWorkspaceChanges(listener: () => void): () => void {
  let subscribedRoot = currentWorkspaceRoot();
  let unsubscribe = subscribeWorkspaceChanges(subscribedRoot, listener);
  const stopFollowing = onWorkspacesChanged(() => {
    const root = currentWorkspaceRoot();
    if (root !== subscribedRoot) {
      unsubscribe();
      subscribedRoot = root;
      unsubscribe = subscribeWorkspaceChanges(root, listener);
    }
    listener();
  });
  return () => {
    stopFollowing();
    unsubscribe();
  };
}
