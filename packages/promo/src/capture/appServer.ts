import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const APP_DIR = fileURLToPath(new URL("../../../app/", import.meta.url));
const START_TIMEOUT = 60_000;

export type AppServer = { url: string; stop(): Promise<void> };

/**
 * `packages/app`의 마지막 build로 `next start`를 띄우고, 데모 workspace를 연 상태로 응답할 때까지 기다립니다.
 * 서버가 실행하는 bd도 데모 workspace의 bd와 같은 설정을 읽도록 `env`를 그대로 넘깁니다.
 */
export async function startAppServer(
  workspace: string,
  env: NodeJS.ProcessEnv,
): Promise<AppServer> {
  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  // 셸에 export한 앱 설정(`BEADS_DESK_LOCAL_FILE_ROOTS` 등)과 packages/app의 `.env*` 파일이 캡처 결과를 바꾸지 않게 합니다.
  // `__NEXT_PROCESSED_ENV`를 주면 Next.js가 `.env*` 파일을 읽지 않습니다. e2e/support/appServer.ts와 같은 방법입니다.
  const inherited = Object.entries(env).filter(([key]) => !key.startsWith("BEADS_DESK_"));
  const server = spawn(
    join(APP_DIR, "node_modules/.bin/next"),
    ["start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: APP_DIR,
      env: {
        ...Object.fromEntries(inherited),
        __NEXT_PROCESSED_ENV: "true",
        BEADS_DESK_WORKSPACE: workspace,
      },
      stdio: ["ignore", "pipe", "pipe"],
      // 서버가 띄운 bd까지 함께 끝내도록 process group을 따로 둡니다.
      detached: true,
    },
  );
  let output = "";
  const keep = (chunk: Buffer) => {
    output = (output + chunk.toString()).slice(-4000);
  };
  server.stdout.on("data", keep);
  server.stderr.on("data", keep);
  const exited = once(server, "exit");
  const stop = async () => {
    if (server.exitCode === null && server.pid !== undefined) {
      process.kill(-server.pid, "SIGTERM");
      await exited;
    }
  };

  try {
    await waitUntilServing(url, workspace, () => server.exitCode !== null);
  } catch (error) {
    await stop();
    throw new Error(`${error instanceof Error ? error.message : error}\n${output}`, {
      cause: error,
    });
  }
  return { url, stop };
}

async function waitUntilServing(url: string, workspace: string, exited: () => boolean) {
  const deadline = Date.now() + START_TIMEOUT;
  while (Date.now() < deadline) {
    if (exited()) {
      throw new Error(
        "app 서버가 시작하지 못하고 끝났습니다. `pnpm run build`를 먼저 실행했는지 확인합니다.",
      );
    }
    if ((await workspacesOf(url)).includes(workspace)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`app 서버가 ${START_TIMEOUT}ms 안에 응답하지 않았습니다.`);
}

async function workspacesOf(url: string): Promise<string[]> {
  try {
    const response = await fetch(`${url}/api/health`);
    if (!response.ok) return [];
    const body: { runtime: { workspaces: string[] } } = await response.json();
    return body.runtime.workspaces;
  } catch {
    return [];
  }
}

/** 운영체제가 고른 빈 포트입니다. 사용자가 띄운 bd-desk(3000번부터)나 e2e 서버(3900번부터)와 겹치지 않습니다. */
async function freePort(): Promise<number> {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const address = probe.address();
  probe.close();
  if (address === null || typeof address === "string")
    throw new Error("빈 포트를 찾지 못했습니다.");
  return address.port;
}
