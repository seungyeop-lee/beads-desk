import { spawn } from "node:child_process";
import { once } from "node:events";
import { tmpdir } from "node:os";
import { test as base } from "@playwright/test";

/** worker마다 띄우는 서버의 첫 포트입니다. bd-desk와 next dev가 쓰는 3000번대와 겹치지 않습니다. */
const BASE_PORT = 3900;
const START_TIMEOUT = 60_000;

/**
 * 서버의 현재 workspace는 서버 전체에서 하나라서, worker마다 마지막 build로 `next start`를 따로 띄웁니다.
 * 한 worker의 시나리오는 차례로 실행되므로 서버 하나를 시나리오 하나만 씁니다.
 * worker가 다시 떠도 같은 포트를 쓰도록 workerIndex가 아니라 parallelIndex로 포트를 정합니다.
 */
export const test = base.extend<object, { appServerUrl: string }>({
  appServerUrl: [
    // eslint-disable-next-line no-empty-pattern -- Playwright는 fixture의 첫 인자를 구조 분해로만 받습니다.
    async ({}, use, workerInfo) => {
      const port = BASE_PORT + workerInfo.parallelIndex;
      const url = `http://127.0.0.1:${port}`;
      if (await healthy(url)) {
        throw new Error(`${port}번 포트를 다른 서버가 쓰고 있어 e2e 서버를 띄울 수 없습니다.`);
      }

      const server = spawn("next", ["start", "--hostname", "127.0.0.1", "--port", String(port)], {
        // 시작 workspace를 지정하지 않으면 서버가 cwd의 상위에서 이 저장소의 `.beads`를 찾아 씁니다.
        // `.beads`가 없는 디렉터리를 주어, 시나리오가 workspace를 고르기 전에도 실제 저장소를 보지 않게 합니다.
        env: { ...process.env, BEADS_DESK_WORKSPACE: tmpdir() },
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

      try {
        await waitUntilHealthy(url, exited, () => output);
        await use(url);
      } finally {
        if (server.exitCode === null && server.pid !== undefined) {
          process.kill(-server.pid, "SIGTERM");
          await exited;
        }
      }
    },
    { scope: "worker", timeout: START_TIMEOUT + 10_000 },
  ],
  baseURL: async ({ appServerUrl }, use) => {
    await use(appServerUrl);
  },
});

async function waitUntilHealthy(url: string, exited: Promise<unknown>, output: () => string) {
  let stopped = false;
  void exited.then(() => {
    stopped = true;
  });
  const deadline = Date.now() + START_TIMEOUT;
  while (Date.now() < deadline) {
    if (stopped) throw new Error(`e2e 서버가 시작하지 못하고 끝났습니다.\n${output()}`);
    if (await healthy(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`e2e 서버가 ${START_TIMEOUT}ms 안에 응답하지 않았습니다.\n${output()}`);
}

async function healthy(url: string): Promise<boolean> {
  try {
    return (await fetch(`${url}/api/health`)).ok;
  } catch {
    return false;
  }
}
