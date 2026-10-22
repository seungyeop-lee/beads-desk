import { findWorkspace } from "@/server/infra/runtime/serverRuntime";
import { decodeWorkspaceSlug, type Workspace } from "@/shared/contract/workspaces";

/**
 * 화면 주소의 workspace segment로 등록한 workspace를 찾습니다. 없으면 null입니다.
 * 등록한 이름에는 `%`가 들어가지 않으므로, segment가 percent-encoding된 채로 와도 풀어서 찾습니다.
 */
export function findRegisteredWorkspace(segment: string): Workspace | null {
  const slug = decodeWorkspaceSlug(segment);
  return slug === null ? null : findWorkspace(slug);
}
