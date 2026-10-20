import { useEffect, useState, useSyncExternalStore } from "react";
import {
  loadActivitySeenAt,
  saveActivitySeenAt,
} from "@/client/infra/activityFeed/activitySeenStore";
import { documentWorkspace } from "@/client/infra/workspaces/documentWorkspace";

/**
 * 화면을 열기 전에 저장돼 있던, 이 workspace의 활동 화면을 마지막으로 연 시각입니다. 저장된 값이 없거나 아직 읽기 전이면 null입니다.
 * 읽은 뒤 updateOnOpen이면 지금 시각을 새 값으로 저장합니다. 돌려주는 값은 화면이 열려 있는 동안 바뀌지 않습니다.
 * localStorage는 browser에만 있어서, 서버가 그린 화면과 처음 그린 화면이 같도록 mount된 뒤에 읽습니다.
 */
export function useActivitySeenAt(updateOnOpen: boolean): number | null {
  const [opening] = useState(createOpening);
  const seenAt = useSyncExternalStore(opening.subscribe, opening.seenAt, noSeenAt);
  useEffect(() => opening.open(updateOnOpen), [opening, updateOnOpen]);
  return seenAt;
}

/**
 * 화면을 한 번 연 동안 읽은 값을 담습니다. 개발 모드의 StrictMode는 effect를 두 번 실행하므로,
 * 두 번째 실행이 방금 저장한 시각을 다시 읽지 않도록 mount마다 한 번만 읽고 저장합니다.
 */
function createOpening() {
  let opened = false;
  let seenAt: number | null = null;
  const listeners = new Set<() => void>();
  return {
    open(updateOnOpen: boolean) {
      if (opened) return;
      opened = true;
      const workspace = documentWorkspace();
      if (workspace === null) return;
      seenAt = loadActivitySeenAt(workspace);
      if (updateOnOpen) saveActivitySeenAt(workspace, Date.now());
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    seenAt: () => seenAt,
  };
}

function noSeenAt(): null {
  return null;
}
