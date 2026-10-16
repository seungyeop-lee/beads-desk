import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test as base, type WorkerInfo } from "@playwright/test";

/** worker 서버 포트를 찾기 시작하는 번호입니다. bd-desk와 next dev가 쓰는 3000번대와 겹치지 않습니다. */
const BASE_PORT = 3900;
/** worker 하나가 확인하는 포트 후보 수입니다. 다른 worktree의 e2e가 함께 돌면 앞 후보를 그쪽이 쓰고 있습니다. */
const MAX_PORT_ATTEMPTS = 20;
const START_TIMEOUT = 60_000;

type AppServer = { url: string; stop(): Promise<void> };

/**
 * 서버의 현재 workspace는 서버 전체에서 하나라서, worker마다 마지막 build로 `next start`를 따로 띄웁니다.
 * 한 worker의 시나리오는 차례로 실행되므로 서버 하나를 시나리오 하나만 씁니다.
 */
export const test = base.extend<object, { appServerUrl: string }>({
  appServerUrl: [
    // eslint-disable-next-line no-empty-pattern -- Playwright는 fixture의 첫 인자를 구조 분해로만 받습니다.
    async ({}, use, workerInfo) => {
      const server = await startOnFreePort(workerInfo);
      try {
        await use(server.url);
      } finally {
        await server.stop();
      }
    },
    { scope: "worker", timeout: START_TIMEOUT + 10_000 },
  ],
  baseURL: async ({ appServerUrl }, use) => {
    await use(appServerUrl);
  },
});

/**
 * worker마다 `BASE_PORT + parallelIndex`부터 worker 수만큼 건너뛰며 후보를 보므로, 같은 실행의 worker끼리는 후보가 겹치지 않습니다.
 * 다른 프로세스가 받고 있는 포트는 건너뜁니다. 다른 실행의 서버가 같은 포트를 먼저 열면 다음 후보로 넘어갑니다.
 */
async function startOnFreePort({ parallelIndex, config }: WorkerInfo): Promise<AppServer> {
  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt += 1) {
    const port = BASE_PORT + parallelIndex + attempt * config.workers;
    if (await isTaken(port)) continue;
    const server = await startAppServer(port);
    if (server) return server;
  }
  throw new Error(`e2e 서버를 띄울 빈 포트를 ${MAX_PORT_ATTEMPTS}번 안에 찾지 못했습니다.`);
}

/** 서버를 띄우고 응답할 때까지 기다립니다. 그 사이 다른 프로세스가 포트를 열었으면 undefined를 돌려줍니다. */
async function startAppServer(port: number): Promise<AppServer | undefined> {
  const url = `http://127.0.0.1:${port}`;
  // 시작 workspace를 지정하지 않으면 서버가 cwd의 상위에서 이 저장소의 `.beads`를 찾아 씁니다.
  // `.beads`가 없는 빈 디렉터리를 주어, 시나리오가 workspace를 고르기 전에도 실제 저장소를 보지 않게 합니다.
  // 서버마다 다른 디렉터리를 주고, health 응답의 첫 workspace로 응답한 서버가 이 서버인지 가립니다.
  const launchRoot = await mkdtemp(join(tmpdir(), "beads-desk-e2e-server-"));
  const server = spawn("next", ["start", "--hostname", "127.0.0.1", "--port", String(port)], {
    env: { ...process.env, BEADS_DESK_WORKSPACE: launchRoot },
    stdio: ["ignore", "pipe", "pipe"],
    // 서버가 띄운 하위 프로세스까지 함께 끝내도록 process group을 따로 둡니다.
    detached: true,
  });
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
    await rm(launchRoot, { recursive: true, force: true });
  };

  try {
    await waitUntilHealthy(url, launchRoot, exited, () => output);
  } catch (error) {
    await stop();
    if (output.includes("EADDRINUSE")) return undefined;
    throw error;
  }
  return { url, stop };
}

async function waitUntilHealthy(
  url: string,
  launchRoot: string,
  exited: Promise<unknown>,
  output: () => string,
) {
  let stopped = false;
  void exited.then(() => {
    stopped = true;
  });
  const deadline = Date.now() + START_TIMEOUT;
  while (Date.now() < deadline) {
    if (stopped) throw new Error(`e2e 서버가 시작하지 못하고 끝났습니다.\n${output()}`);
    if ((await launchRootOf(url)) === launchRoot) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`e2e 서버가 ${START_TIMEOUT}ms 안에 응답하지 않았습니다.\n${output()}`);
}

/** 서버가 시작할 때 받은 workspace입니다. 응답하는 서버가 없으면 undefined입니다. */
async function launchRootOf(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(`${url}/api/health`);
    if (!response.ok) return undefined;
    const body: { runtime: { workspaces: string[] } } = await response.json();
    return body.runtime.workspaces[0];
  } catch {
    return undefined;
  }
}

/**
 * macOS는 다른 서버가 `::`나 `0.0.0.0`에서 같은 포트를 받고 있어도 `127.0.0.1`을 열게 해 줍니다.
 * 그러면 그 서버로 가던 localhost 요청을 e2e 서버가 가로채므로, IPv4와 IPv6 양쪽에 연결해 받는 서버가 있는지 봅니다.
 */
async function isTaken(port: number): Promise<boolean> {
  return (await isAnswering(port, "127.0.0.1")) || (await isAnswering(port, "::1"));
}

/** IPv6를 쓸 수 없는 환경처럼 연결이 어떤 이유로든 실패하면 받는 서버가 없다고 봅니다. */
function isAnswering(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect(port, host);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}
