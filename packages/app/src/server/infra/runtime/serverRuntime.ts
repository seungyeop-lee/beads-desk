import { runBd } from "@beads-desk/bd";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
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
 * path에서 bd가 쓰는 workspace 디렉터리를 찾아 등록하고, 등록한 디렉터리를 돌려줍니다.
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

// bd가 workspace를 찾는 방식을 따릅니다. path부터 git 저장소 최상위까지(git 밖이면 파일 시스템 루트까지) 올라가며 `.beads`를 찾고,
// git worktree라 찾지 못했으면 bd처럼 main 저장소의 `.beads`를 씁니다. 이때 workspace는 worktree 최상위 디렉터리로 두어,
// bd 실행과 git을 읽는 기능이 그 worktree의 브랜치를 기준으로 동작하게 합니다.
// symlink를 거친 경로와 실제 경로가 다른 workspace로 등록되지 않게 실제 경로로 바꿉니다.
// launcher(`bin/daemon.js`)도 같은 규칙을 따로 구현하므로 함께 고칩니다.
function findWorkspaceRoot(path: string): string | null {
  if (!isDirectory(resolve(path))) return null;
  const start = realpathSync(resolve(path));
  const git = gitRepository(start);
  for (let dir = start; ; dir = dirname(dir)) {
    if (hasBeadsProject(dir)) return dir;
    if (dir === git?.topLevel || dirname(dir) === dir) break;
  }
  return git && hasBeadsProject(dirname(git.commonDir)) ? git.topLevel : null;
}

// bd는 설정이나 DB 파일이 있는 `.beads`만 workspace로 봅니다. bd가 전역 상태를 두는 `~/.beads`는 workspace가 아닙니다.
function hasBeadsProject(dir: string): boolean {
  const beads = join(dir, ".beads");
  return (
    isDirectory(beads) &&
    readdirSync(beads).some(
      (name) => name === "metadata.json" || name === "config.yaml" || name.endsWith(".db"),
    )
  );
}

/**
 * dir이 속한 git 저장소의 최상위 디렉터리와 공용 git 디렉터리를 돌려줍니다. worktree면 공용 git 디렉터리가 main 저장소의 `.git`입니다.
 * git 저장소가 아니거나 git이 없으면 null을 돌려줍니다.
 */
function gitRepository(dir: string): { topLevel: string; commonDir: string } | null {
  // git hook 안에서 띄우면 GIT_DIR 등이 다른 저장소를 가리키므로, dir만으로 저장소를 찾게 GIT_ 환경 변수를 뺍니다.
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
  const result = spawnSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--show-toplevel", "--git-common-dir"],
    { cwd: dir, env, encoding: "utf8" },
  );
  const [topLevel, commonDir] = result.status === 0 ? result.stdout.trim().split("\n") : [];
  return topLevel && commonDir
    ? { topLevel: realpathSync(topLevel), commonDir: realpathSync(commonDir) }
    : null;
}

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}
