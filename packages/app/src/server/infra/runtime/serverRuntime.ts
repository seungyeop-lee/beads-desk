import { runBd } from "@beads-desk/bd";
import { isAbsolute } from "node:path";
// launcher(`bin/bd-desk.js`)와 같은 규칙으로 workspace를 찾도록 launcher가 쓰는 파일을 그대로 씁니다.
import { findWorkspaceRoot } from "../../../../bin/workspaceRoot.js";
import { globalState } from "@/server/infra/globalState/globalState";
import { assignWorkspaceSlugs } from "@/server/modules/workspaces/domain/workspaceSlugs";
import type { Workspace } from "@/shared/contract/workspaces";

export type ServerRuntime = {
  /** 등록한 workspace 디렉터리입니다. 등록한 순서대로 둡니다. */
  workspaces: string[];
  bdVersion: string | null;
};

type RuntimeState = ServerRuntime & { changeListeners: Set<() => void> };

const RUNTIME_KEY = Symbol.for("beads-desk.serverRuntime");

export async function startServerRuntime(): Promise<void> {
  const runtime = runtimeState();
  const result = await runBd(["version"], { cwd: runtime.workspaces[0] });
  if (result.code === 0) {
    runtime.bdVersion = result.stdout.trim();
  }
}

export function getServerRuntime(): ServerRuntime {
  const { workspaces, bdVersion } = runtimeState();
  return { workspaces: [...workspaces], bdVersion };
}

/** 등록한 workspace를 등록한 순서대로, 화면 주소에 쓰는 이름과 함께 돌려줍니다. */
export function listWorkspaces(): Workspace[] {
  const { workspaces } = runtimeState();
  const slugs = assignWorkspaceSlugs(workspaces);
  return workspaces.map((root, index) => ({ root, slug: slugs[index]! }));
}

/** 화면 주소의 이름으로 등록한 workspace를 찾습니다. 없으면 null입니다. */
export function findWorkspace(slug: string): Workspace | null {
  return listWorkspaces().find((workspace) => workspace.slug === slug) ?? null;
}

/**
 * path에서 bd가 쓰는 workspace 디렉터리를 찾아 등록하고, 등록한 workspace를 돌려줍니다.
 * 이미 등록한 workspace면 그대로 돌려줍니다. 절대 경로가 아니거나 beads workspace를 찾지 못하면 null을 돌려줍니다.
 */
export function registerWorkspace(path: string): Workspace | null {
  if (!isAbsolute(path)) return null;
  const root = findWorkspaceRoot(path);
  if (!root) return null;
  const runtime = runtimeState();
  if (!runtime.workspaces.includes(root)) {
    runtime.workspaces.push(root);
    notifyChange(runtime);
  }
  return listWorkspaces().find((workspace) => workspace.root === root)!;
}

/** 새 workspace를 등록하면 listener를 호출합니다. */
export function onWorkspacesChanged(listener: () => void): () => void {
  const { changeListeners } = runtimeState();
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

function notifyChange(runtime: RuntimeState): void {
  for (const listener of runtime.changeListeners) listener();
}

function runtimeState(): RuntimeState {
  return globalState(RUNTIME_KEY, () => {
    const launchRoot = launchWorkspaceRoot();
    return {
      workspaces: [findWorkspaceRoot(launchRoot) ?? launchRoot],
      bdVersion: null,
      changeListeners: new Set(),
    };
  });
}

// launcher가 사용자가 명령을 실행한 디렉터리를 넘깁니다. `next dev`로 직접 띄우면 서버의 cwd를 씁니다.
function launchWorkspaceRoot(): string {
  return process.env.BEADS_DESK_WORKSPACE || process.cwd();
}
