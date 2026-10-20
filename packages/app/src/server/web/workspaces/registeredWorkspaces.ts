import { findWorkspace, listWorkspaces } from "@/server/infra/runtime/serverRuntime";
import type { Workspace } from "@/shared/contract/workspaces";

/** 화면 route가 쓰는 등록한 workspace 목록입니다. 등록한 순서대로 둡니다. */
export function registeredWorkspaces(): Workspace[] {
  return listWorkspaces();
}

/**
 * 화면 주소의 workspace segment로 등록한 workspace를 찾습니다. 없으면 null입니다.
 * 등록한 이름에는 `%`가 들어가지 않으므로, segment가 percent-encoding된 채로 와도 풀어서 찾습니다.
 */
export function findRegisteredWorkspace(segment: string): Workspace | null {
  try {
    return findWorkspace(decodeURIComponent(segment));
  } catch {
    return null;
  }
}
