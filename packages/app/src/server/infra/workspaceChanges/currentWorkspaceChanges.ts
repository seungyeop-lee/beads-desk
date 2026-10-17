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
    if (root === subscribedRoot) {
      listener();
      return;
    }
    // 새 workspace를 구독하면 기준값을 읽은 뒤 listener가 한 번 호출되므로 여기서는 호출하지 않습니다.
    // 여기서도 호출하면 전환 한 번에 화면이 두 번 다시 읽습니다. 모든 구독자가 같은 알림 안에서 새 workspace로 옮겨 가므로,
    // 새 workspace의 처음 조회가 끝나기 전에 모두 구독해 그 호출을 받습니다.
    unsubscribe();
    subscribedRoot = root;
    unsubscribe = subscribeWorkspaceChanges(root, listener);
  });
  return () => {
    stopFollowing();
    unsubscribe();
  };
}
