#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;
const MAX_PORT_ATTEMPTS = 100;
const SERVER_READY_TIMEOUT_MS = 30_000;
const STOP_TIMEOUT_MS = 5_000;

const USAGE = `사용법: beads-desk [start|stop|restart] [--port <번호>] [--no-open]

  start    서버를 background로 시작하고 브라우저를 엽니다. 명령을 생략하면 start입니다.
           이미 실행 중이면 지금 디렉터리를 workspace로 등록해 현재 workspace로 바꿉니다.
  stop     실행 중인 서버를 종료합니다.
  restart  같은 포트로 다시 시작하고, 등록한 workspace와 현재 workspace를 이어받습니다.

  --port <번호>  서버 포트입니다. 지정하지 않으면 ${DEFAULT_PORT}번부터 비어 있는 포트를 씁니다.
  --no-open     브라우저를 열지 않습니다. BEADS_DESK_NO_OPEN=1과 같습니다.`;

const require = createRequire(import.meta.url);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeDir = resolveRuntimeDir();
const statePath = join(runtimeDir, "server.json");
const logPath = join(runtimeDir, "server.log");

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}
const options = parseArguments(args);
if (!options) {
  console.error(USAGE);
  process.exit(1);
}

try {
  if (options.command === "start") await start(options);
  else if (options.command === "stop") process.exitCode = (await stop()) ? 0 : 2;
  else await restart(options);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

async function start({ port, open }) {
  const running = await runningServer();
  if (running) {
    const list = await registerWorkspace(running.url, process.cwd(), true);
    console.log(`이미 실행 중인 서버에서 workspace를 바꿨습니다: ${list.current}`);
    console.log(`URL: ${running.url}`);
    if (open) openBrowser(running.url);
    return;
  }
  const server = await launch(process.cwd(), port);
  console.log(`workspace: ${process.cwd()}`);
  console.log(`URL: ${server.url}`);
  console.log("종료하려면 beads-desk stop을 실행하세요.");
  if (open) openBrowser(server.url);
}

async function stop() {
  const running = await runningServer();
  if (!running) {
    console.log("실행 중인 beads-desk 서버가 없습니다.");
    return false;
  }
  await terminate(running.pid);
  console.log("서버를 종료했습니다.");
  return true;
}

async function restart({ port }) {
  const running = await runningServer();
  if (!running) {
    console.log("실행 중인 서버가 없어 새로 시작합니다.");
    await start({ port, open: false });
    return;
  }
  const list = await readWorkspaces(running.url);
  await terminate(running.pid);
  const server = await launch(list.current, port ?? running.port);
  for (const workspace of list.workspaces) {
    if (workspace !== list.current) await registerWorkspace(server.url, workspace, false);
  }
  console.log(`workspace: ${list.current}`);
  console.log(`URL: ${server.url}`);
}

/** `next start`를 background로 시작하고, 요청을 받을 수 있을 때까지 기다립니다. */
async function launch(workspaceRoot, requestedPort) {
  if (!existsSync(resolve(packageRoot, ".next", "BUILD_ID"))) {
    throw new Error("빌드 결과물을 찾지 못했습니다. 패키지를 다시 설치해 주세요.");
  }
  const port = requestedPort ?? (await findAvailablePort(DEFAULT_PORT));
  if (requestedPort && !(await isPortAvailable(requestedPort))) {
    throw new Error(`${requestedPort}번 포트가 사용 중입니다.`);
  }
  if (!requestedPort && port !== DEFAULT_PORT) {
    console.log(`${DEFAULT_PORT}번 포트가 사용 중이라 ${port}번 포트로 시작합니다.`);
  }

  const url = `http://${HOST}:${port}`;
  const log = openSync(logPath, "a");
  // next start는 패키지 루트에서 실행해야 하므로, workspace 디렉터리는 환경 변수로 넘깁니다.
  // 명령을 실행한 터미널이 닫혀도 서버가 남도록 새 process group으로 분리합니다.
  const server = spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      "start",
      packageRoot,
      "--port",
      String(port),
      "--hostname",
      HOST,
    ],
    {
      cwd: packageRoot,
      env: {
        ...process.env,
        BEADS_DESK_WORKSPACE: workspaceRoot,
        HOSTNAME: HOST,
        PORT: String(port),
      },
      stdio: ["ignore", log, log],
      detached: true,
    },
  );
  server.unref();
  writeFileSync(statePath, JSON.stringify({ pid: server.pid, port, url }));

  try {
    await waitForServer(url, server.pid);
  } catch (error) {
    await terminate(server.pid);
    throw new Error(`${error.message} 로그: ${logPath}`, { cause: error });
  }
  return { url, port };
}

/** 상태 파일의 서버가 살아 있고 요청에 응답하면 그 서버를 돌려줍니다. 남은 상태 파일은 지웁니다. */
async function runningServer() {
  let state;
  try {
    state = JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return null;
  }
  if (isAlive(state.pid) && (await isHealthy(state.url))) return state;
  rmSync(statePath, { force: true });
  return null;
}

async function terminate(pid) {
  signalGroup(pid, "SIGTERM");
  const deadline = Date.now() + STOP_TIMEOUT_MS;
  while (isAlive(pid) && Date.now() < deadline) await sleep(100);
  if (isAlive(pid)) signalGroup(pid, "SIGKILL");
  rmSync(statePath, { force: true });
}

// next start가 띄운 하위 process까지 함께 끝나도록 process group 전체에 보냅니다.
function signalGroup(pid, signal) {
  try {
    process.kill(process.platform === "win32" ? pid : -pid, signal);
  } catch {
    // 이미 종료됐습니다.
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

async function isHealthy(url) {
  try {
    return (await fetch(`${url}/api/health`)).ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, pid) {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) throw new Error("서버가 준비되기 전에 종료됐습니다.");
    if (await isHealthy(url)) return;
    await sleep(250);
  }
  throw new Error("서버가 준비되기를 기다리다 시간이 초과됐습니다.");
}

async function registerWorkspace(url, path, select) {
  const response = await fetch(`${url}/api/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, select }),
  });
  const body = await response.json();
  if (!body.ok) throw new Error(body.error);
  return body.data;
}

async function readWorkspaces(url) {
  const body = await (await fetch(`${url}/api/workspaces`)).json();
  if (!body.ok) throw new Error(body.error);
  return body.data;
}

async function findAvailablePort(startPort) {
  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt += 1) {
    if (await isPortAvailable(startPort + attempt)) return startPort + attempt;
  }
  throw new Error("사용 가능한 로컬 포트를 찾지 못했습니다.");
}

function isPortAvailable(port) {
  return new Promise((resolvePort) => {
    const probe = createServer();
    probe.once("error", () => resolvePort(false));
    probe.once("listening", () => probe.close(() => resolvePort(true)));
    probe.listen(port, HOST);
  });
}

function openBrowser(url) {
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  spawn(command, args, { detached: true, stdio: "ignore" }).unref();
}

function parseArguments(args) {
  const parsed = {
    command: "start",
    port: undefined,
    open: process.env.BEADS_DESK_NO_OPEN !== "1",
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (index === 0 && ["start", "stop", "restart"].includes(arg)) parsed.command = arg;
    else if (arg === "--no-open") parsed.open = false;
    else if (arg === "--port") {
      parsed.port = Number(args[++index]);
      if (!Number.isInteger(parsed.port) || parsed.port <= 0 || parsed.port > 65_535) return null;
    } else return null;
  }
  return parsed;
}

// 사용자별 runtime 디렉터리에 상태 파일과 로그를 둡니다. 다른 사용자가 읽지 못하게 0700으로 만듭니다.
function resolveRuntimeDir() {
  const base = process.env.XDG_RUNTIME_DIR || tmpdir();
  const dir = join(base, "beads-desk");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

function sleep(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}
