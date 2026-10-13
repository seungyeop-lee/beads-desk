import { runBd } from "@beads-desk/bd";
import { existsSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

export type ServerRuntime = {
  /** bd를 실행할 현재 workspace 디렉터리입니다. */
  workspaceRoot: string;
  /** 고를 수 있는 workspace 디렉터리입니다. 등록한 순서대로 둡니다. */
  workspaces: string[];
  bdVersion: string | null;
};

type RuntimeState = ServerRuntime & { changeListeners: Set<() => void> };

// instrumentation과 route handler는 이 module을 서로 다른 사본으로 불러옵니다.
// module 변수는 공유되지 않으므로 process 전역에 둡니다.
const RUNTIME_KEY = Symbol.for("beads-desk.serverRuntime");

type RuntimeHolder = { [RUNTIME_KEY]?: RuntimeState };

export async function startServerRuntime(): Promise<void> {
  const runtime = runtimeState();
  const result = await runBd(["version"], { cwd: runtime.workspaceRoot });
  if (result.code === 0) {
    runtime.bdVersion = result.stdout.trim();
  }
}

export function getServerRuntime(): ServerRuntime {
  const { workspaceRoot, workspaces, bdVersion } = runtimeState();
  return { workspaceRoot, workspaces: [...workspaces], bdVersion };
}

export function currentWorkspaceRoot(): string {
  return runtimeState().workspaceRoot;
}

export function listWorkspaces(): string[] {
  return [...runtimeState().workspaces];
}

/**
 * path나 그 상위에서 `.beads`가 있는 디렉터리를 찾아 workspace로 등록하고, 등록한 디렉터리를 돌려줍니다.
 * 절대 경로가 아니거나 beads workspace를 찾지 못하면 null을 돌려줍니다.
 */
export function registerWorkspace(path: string): string | null {
  if (!isAbsolute(path)) return null;
  const root = findWorkspaceRoot(path);
  if (!root) return null;
  const runtime = runtimeState();
  if (!runtime.workspaces.includes(root)) {
    runtime.workspaces.push(root);
    notifyChange(runtime);
  }
  return root;
}

/** 등록한 workspace를 현재 workspace로 바꿉니다. 등록하지 않은 디렉터리면 false를 돌려줍니다. */
export function selectWorkspace(root: string): boolean {
  const runtime = runtimeState();
  if (!runtime.workspaces.includes(root)) return false;
  if (runtime.workspaceRoot !== root) {
    runtime.workspaceRoot = root;
    notifyChange(runtime);
  }
  return true;
}

/** 새 workspace를 등록하거나 현재 workspace가 바뀌면 listener를 호출합니다. */
export function onWorkspacesChanged(listener: () => void): () => void {
  const { changeListeners } = runtimeState();
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

function notifyChange(runtime: RuntimeState): void {
  for (const listener of runtime.changeListeners) listener();
}

function runtimeState(): RuntimeState {
  const holder = globalThis as RuntimeHolder;
  if (!holder[RUNTIME_KEY]) {
    const launchRoot = launchWorkspaceRoot();
    const workspaceRoot = findWorkspaceRoot(launchRoot) ?? launchRoot;
    holder[RUNTIME_KEY] = {
      workspaceRoot,
      workspaces: [workspaceRoot],
      bdVersion: null,
      changeListeners: new Set(),
    };
  }
  return holder[RUNTIME_KEY];
}

// launcher가 사용자가 명령을 실행한 디렉터리를 넘깁니다. `next dev`로 직접 띄우면 서버의 cwd를 씁니다.
function launchWorkspaceRoot(): string {
  return process.env.BEADS_DESK_WORKSPACE || process.cwd();
}

// bd는 실행한 디렉터리의 상위에서도 `.beads`를 찾으므로 같은 방식으로 workspace 디렉터리를 정합니다.
// symlink를 거친 경로와 실제 경로가 다른 workspace로 등록되지 않게 실제 경로로 바꿉니다.
function findWorkspaceRoot(path: string): string | null {
  if (!isDirectory(resolve(path))) return null;
  let dir = realpathSync(resolve(path));
  for (;;) {
    if (isDirectory(join(dir, ".beads"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}
