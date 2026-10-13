import { runBd } from "@beads-desk/bd";

export type ServerRuntime = {
  workspaceRoot: string;
  bdVersion: string | null;
};

// instrumentation과 route handler는 이 module을 서로 다른 사본으로 불러옵니다.
// module 변수는 공유되지 않으므로 process 전역에 둡니다.
const RUNTIME_KEY = Symbol.for("beads-desk.serverRuntime");

type RuntimeHolder = { [RUNTIME_KEY]?: ServerRuntime };

export async function startServerRuntime(): Promise<void> {
  const workspaceRoot = launchWorkspaceRoot();
  const runtime: ServerRuntime = { workspaceRoot, bdVersion: null };
  (globalThis as RuntimeHolder)[RUNTIME_KEY] = runtime;

  const result = await runBd(["version"], { cwd: workspaceRoot });
  if (result.code === 0) {
    runtime.bdVersion = result.stdout.trim();
  }
}

export function getServerRuntime(): ServerRuntime | null {
  return (globalThis as RuntimeHolder)[RUNTIME_KEY] ?? null;
}

/** bd를 실행할 workspace 디렉터리입니다. */
export function currentWorkspaceRoot(): string {
  return getServerRuntime()?.workspaceRoot ?? launchWorkspaceRoot();
}

// launcher가 사용자가 명령을 실행한 디렉터리를 넘깁니다. `next dev`로 직접 띄우면 서버의 cwd를 씁니다.
function launchWorkspaceRoot(): string {
  return process.env.BEADS_DESK_WORKSPACE || process.cwd();
}
