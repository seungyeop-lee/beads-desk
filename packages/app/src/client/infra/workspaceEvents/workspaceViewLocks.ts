import { heldSharedLockNames, holdSharedLock } from "@/client/infra/webLocks/navigatorLocks";

// 탭마다 보는 workspace를 이 이름으로 시작하는 shared lock으로 쥐고 있습니다. 연결을 연 탭은 lock 목록에서 감시할
// workspace를 모아 연결 하나로 함께 감시합니다. 탭이 닫히면 브라우저가 lock을 풀므로 탭 목록을 따로 관리하지 않습니다.
const VIEW_LOCK_PREFIX = "beads-desk.workspace-view:";

/** 이 탭이 보는 workspace의 이름입니다. 구독자가 없으면 null입니다. */
let viewed: string | null = null;
let releaseView: (() => void) | null = null;

/** 이 탭이 보는 workspace를 lock으로 표시합니다. workspace가 null이면 표시를 지우고, 새로 보기 시작했으면 onViewed를 부릅니다. */
export function viewWorkspace(workspace: string | null, onViewed: () => void): void {
  if (workspace === viewed) return;
  viewed = workspace;
  releaseView?.();
  releaseView = null;
  if (workspace === null) return;
  releaseView = holdSharedLock(VIEW_LOCK_PREFIX + workspace, onViewed);
}

/** 이 탭이 보는 workspace입니다. */
export function viewedWorkspace(): string | null {
  return viewed;
}

/** lock으로 표시한 탭들의 workspace와 이 탭의 workspace입니다. 순서를 정해 두어 바뀌었는지 비교합니다. */
export async function watchedWorkspaces(): Promise<string[]> {
  // 이 탭이 보는 workspace는 아직 lock을 얻기 전일 수 있으므로, lock 목록을 읽은 뒤에 봅니다.
  const lockedViews = await heldSharedLockNames(VIEW_LOCK_PREFIX);
  const workspaces = new Set(viewed === null ? [] : [viewed]);
  for (const workspace of lockedViews) workspaces.add(workspace);
  return [...workspaces].sort();
}
