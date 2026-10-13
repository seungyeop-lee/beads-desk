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
  const workspaceRoot = process.env.BEADS_DESK_WORKSPACE || process.cwd();
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
