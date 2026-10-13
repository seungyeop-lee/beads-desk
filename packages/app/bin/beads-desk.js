#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;
const MAX_PORT_ATTEMPTS = 100;
const SERVER_READY_TIMEOUT_MS = 30_000;

const require = createRequire(import.meta.url);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const buildIdPath = resolve(packageRoot, ".next", "BUILD_ID");
const nextBinPath = require.resolve("next/dist/bin/next");
const workspaceRoot = process.cwd();

if (!existsSync(buildIdPath)) {
  console.error("빌드 결과물을 찾지 못했습니다. 패키지를 다시 설치해 주세요.");
  process.exit(1);
}

const port = await findAvailablePort(DEFAULT_PORT);
const url = `http://${DEFAULT_HOST}:${port}`;

if (port !== DEFAULT_PORT) {
  console.log(`${DEFAULT_PORT}번 포트가 사용 중이라 ${port}번 포트로 시작합니다.`);
}

// next start는 패키지 루트에서 실행해야 하므로, 사용자가 실행한 디렉터리는 환경 변수로 넘깁니다.
const server = spawn(
  process.execPath,
  [nextBinPath, "start", packageRoot, "--port", String(port), "--hostname", DEFAULT_HOST],
  {
    cwd: packageRoot,
    env: {
      ...process.env,
      BEADS_DESK_WORKSPACE: workspaceRoot,
      HOSTNAME: DEFAULT_HOST,
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

const startupLogs = [];
let shuttingDown = false;

server.stdout?.on("data", (chunk) => {
  rememberStartupLog(chunk);
});

server.stderr?.on("data", (chunk) => {
  rememberStartupLog(chunk);
  process.stderr.write(chunk);
});

server.on("error", (error) => {
  console.error(`서버를 시작하지 못했습니다: ${error.message}`);
  shutdown(1);
});

server.on("exit", (code) => {
  if (!shuttingDown) {
    process.exit(code ?? 1);
  }
});

process.once("SIGINT", () => shutdown(0));
process.once("SIGTERM", () => shutdown(0));

try {
  await waitForServer(`${url}/api/health`);
  console.log(`workspace: ${workspaceRoot}`);
  console.log(`URL: ${url}`);
  if (process.env.BEADS_DESK_NO_OPEN !== "1") {
    openBrowser(url);
  }
  console.log("종료하려면 Ctrl-C를 누르세요.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  if (startupLogs.length > 0) {
    console.error(startupLogs.join("").trimEnd());
  }
  shutdown(1);
}

async function findAvailablePort(startPort) {
  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt += 1) {
    if (await isPortAvailable(startPort + attempt)) {
      return startPort + attempt;
    }
  }
  throw new Error("사용 가능한 로컬 포트를 찾지 못했습니다.");
}

function isPortAvailable(portToCheck) {
  return new Promise((resolvePort) => {
    const probe = createServer();
    probe.once("error", () => resolvePort(false));
    probe.once("listening", () => probe.close(() => resolvePort(true)));
    probe.listen(portToCheck, DEFAULT_HOST);
  });
}

async function waitForServer(healthUrl) {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error("서버가 준비되기 전에 종료됐습니다.");
    }
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // 서버가 아직 요청을 받지 못하는 상태입니다.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }

  throw new Error("서버가 준비되기를 기다리다 시간이 초과됐습니다.");
}

function openBrowser(targetUrl) {
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [targetUrl]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", targetUrl]]
        : ["xdg-open", [targetUrl]];
  spawn(command, args, { detached: true, stdio: "ignore" }).unref();
}

function rememberStartupLog(chunk) {
  startupLogs.push(chunk.toString());
  if (startupLogs.length > 20) {
    startupLogs.shift();
  }
}

function shutdown(exitCode) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  if (server.exitCode !== null || server.signalCode !== null) {
    process.exit(exitCode);
  }
  server.once("exit", () => process.exit(exitCode));
  server.kill("SIGTERM");

  const forceExit = setTimeout(() => {
    server.kill("SIGKILL");
    process.exit(exitCode);
  }, 1_000);
  forceExit.unref();
}
