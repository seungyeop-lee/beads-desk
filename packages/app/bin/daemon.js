import { spawn } from "node:child_process";
import {
  closeSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { connect, createServer } from "node:net";
import { join } from "node:path";
import { findWorkspaceRoot } from "./workspaceRoot.js";

const HOST = "127.0.0.1";
const MAX_PORT_ATTEMPTS = 100;
const SERVER_READY_TIMEOUT_MS = 30_000;
const STOP_TIMEOUT_MS = 5_000;
/** 다른 bd-desk 명령이 서버를 띄우는 동안 기다리는 시간입니다. 서버 준비 시간보다 길어야 합니다. */
const LOCK_TIMEOUT_MS = SERVER_READY_TIMEOUT_MS + STOP_TIMEOUT_MS + 5_000;

/**
 * background 서버를 시작, 종료, 재시작합니다. 각 명령은 종료 코드를 돌려줍니다.
 *
 * @param {object} options
 * @param {string} options.runtimeDir 상태 파일(`server.json`), 로그(`server.log`), lock 파일을 두는 디렉터리입니다.
 * @param {(port: number, workspaceRoot: string) => { command: string; args: string[]; cwd?: string; env: NodeJS.ProcessEnv }} options.serverCommand
 * @param {(url: string) => void} options.openBrowser
 * @param {number} options.defaultPort 포트를 지정하지 않으면 이 포트부터 비어 있는 포트를 씁니다.
 * @param {(message: string) => void} [options.print]
 */
export function createDaemon({
  runtimeDir,
  serverCommand,
  openBrowser,
  defaultPort,
  print = console.log,
}) {
  mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
  const statePath = join(runtimeDir, "server.json");
  const logPath = join(runtimeDir, "server.log");
  const lockPath = join(runtimeDir, "command.lock");

  return {
    /** 이미 실행 중이면 새로 띄우지 않고 cwd를 workspace로 등록해 현재 workspace로 바꿉니다. */
    start: ({ cwd, port, open }) =>
      withLock(async () => {
        const root = workspaceRootOf(cwd);
        const running = await runningServer();
        if (running) {
          const list = await registerWorkspace(running.url, root, true);
          print(`이미 실행 중인 서버에서 workspace를 바꿨습니다: ${list.current}`);
          print(`URL: ${running.url}`);
          if (port && port !== running.port) {
            print(
              `서버가 ${running.port}번 포트에서 실행 중이라 지정한 포트(${port})를 적용하지 않았습니다. 포트를 바꾸려면 다음 명령을 실행하세요: bd-desk restart --port ${port}`,
            );
          }
          if (open) openBrowser(running.url);
          return 0;
        }
        const server = await launch(root, port);
        print(`workspace: ${root}`);
        print(`URL: ${server.url}`);
        print("종료하려면 bd-desk stop을 실행하세요.");
        if (open) openBrowser(server.url);
        return 0;
      }),

    /** 서버가 응답하지 않아도 끌 수 있도록 응답을 기다리지 않고 종료합니다. */
    stop: () =>
      withLock(async () => {
        const state = readState();
        if (!state || !isServerAlive(state.pid)) {
          rmSync(statePath, { force: true });
          print("실행 중인 beads-desk 서버가 없습니다.");
          return 2;
        }
        await terminate(state.pid);
        print("서버를 종료했습니다.");
        return 0;
      }),

    /** 같은 포트로 다시 시작하고, 등록한 workspace를 같은 순서로 등록한 뒤 현재 workspace를 고릅니다. */
    restart: ({ port, open }) =>
      withLock(async () => {
        const running = await runningServer();
        if (!running) {
          const root = workspaceRootOf(process.cwd());
          print("실행 중인 서버가 없어 새로 시작합니다.");
          const server = await launch(root, port);
          print(`URL: ${server.url}`);
          if (open) openBrowser(server.url);
          return 0;
        }
        const list = await readWorkspaces(running.url);
        await terminate(running.pid);

        // 그사이 지워진 workspace는 건너뜁니다. 남은 것이 없으면 이전 현재 workspace로 띄웁니다.
        const [first = list.current, ...rest] = list.workspaces.filter(isWorkspaceRoot);
        const server = await launch(first, port ?? running.port);
        for (const workspace of rest) {
          await registerWorkspace(server.url, workspace, false);
        }
        for (const workspace of list.workspaces.filter((root) => !isWorkspaceRoot(root))) {
          print(`workspace를 찾지 못해 다시 등록하지 않았습니다: ${workspace}`);
        }
        const current = isWorkspaceRoot(list.current)
          ? (await registerWorkspace(server.url, list.current, true)).current
          : first;
        print(`workspace: ${current}`);
        print(`URL: ${server.url}`);
        if (open) openBrowser(server.url);
        return 0;
      }),
  };

  /** 서버를 background로 시작하고, 요청을 받을 수 있을 때까지 기다립니다. */
  async function launch(workspaceRoot, requestedPort) {
    if (requestedPort && !(await isPortAvailable(requestedPort))) {
      throw new Error(`${requestedPort}번 포트가 사용 중입니다.`);
    }
    const port = requestedPort ?? (await findAvailablePort(defaultPort));
    if (!requestedPort && port !== defaultPort) {
      print(`${defaultPort}번 포트가 사용 중이라 ${port}번 포트로 시작합니다.`);
    }

    const url = `http://${HOST}:${port}`;
    const { command, args, cwd, env } = serverCommand(port, workspaceRoot);
    const log = openSync(logPath, "a");
    // 명령을 실행한 터미널이 닫혀도 서버가 남도록 새 process group으로 분리합니다.
    const server = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", log, log],
      detached: true,
      windowsHide: true,
    });
    closeSync(log);
    server.unref();
    writeFileSync(statePath, JSON.stringify({ pid: server.pid, port, url }));

    try {
      await waitForServer(url, server.pid);
    } catch (error) {
      await terminate(server.pid);
      throw new Error(`${error.message} 로그: ${logPath}`, { cause: error });
    }
    if ((await readHealth(url))?.runtime?.bdVersion === null) {
      print(
        "경고: 서버가 bd를 실행하지 못했습니다. bd가 PATH에 있는지 확인하거나 BD_BIN으로 경로를 지정하세요.",
      );
    }
    return { url, port };
  }

  /** 상태 파일의 서버가 살아 있으면 요청을 받을 때까지 기다린 뒤 돌려줍니다. 종료된 서버의 상태 파일은 지웁니다. */
  async function runningServer() {
    const state = readState();
    if (!state) return null;
    if (!isServerAlive(state.pid)) {
      rmSync(statePath, { force: true });
      return null;
    }
    try {
      await waitForServer(state.url, state.pid);
    } catch (error) {
      throw new Error(
        `실행 중인 서버(pid ${state.pid})가 응답하지 않습니다. bd-desk stop으로 종료한 뒤 다시 시작하세요.`,
        { cause: error },
      );
    }
    return state;
  }

  function readState() {
    try {
      return JSON.parse(readFileSync(statePath, "utf8"));
    } catch {
      return null;
    }
  }

  /** pid를 쓴 임시 파일을 lock 이름으로 hard link해, lock 파일이 항상 주인 pid를 담은 채로 생기게 합니다. */
  function acquireLock() {
    const candidate = `${lockPath}.${process.pid}.${Math.random().toString(36).slice(2)}`;
    writeFileSync(candidate, String(process.pid));
    try {
      linkSync(candidate, lockPath);
      return true;
    } catch (error) {
      if (error.code === "EEXIST") return false;
      throw error;
    } finally {
      rmSync(candidate, { force: true });
    }
  }

  /** lock이 없으면 null을 돌려줍니다. */
  function lockOwner() {
    try {
      return Number(readFileSync(lockPath, "utf8"));
    } catch {
      return null;
    }
  }

  async function terminate(pid) {
    signalGroup(pid, "SIGTERM");
    const deadline = Date.now() + STOP_TIMEOUT_MS;
    while (isAlive(pid) && Date.now() < deadline) await sleep(100);
    if (isAlive(pid)) signalGroup(pid, "SIGKILL");
    rmSync(statePath, { force: true });
  }

  /**
   * 상태 파일을 읽고 쓰는 명령이 겹치지 않게 lock 파일을 잡고 실행합니다.
   * lock을 잡은 명령이 비정상 종료돼 lock만 남았으면 그 lock은 무시합니다.
   */
  async function withLock(command) {
    const deadline = Date.now() + LOCK_TIMEOUT_MS;
    while (!acquireLock()) {
      const owner = lockOwner();
      if (owner !== null && !isAlive(owner)) {
        rmSync(lockPath, { force: true });
        continue;
      }
      if (Date.now() > deadline) {
        throw new Error("다른 bd-desk 명령이 끝나기를 기다리다 시간이 초과됐습니다.");
      }
      await sleep(100);
    }
    try {
      return await command();
    } finally {
      rmSync(lockPath, { force: true });
    }
  }
}

// 서버가 띄운 하위 process까지 함께 끝나도록 process group 전체에 보냅니다.
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

/**
 * 서버는 detached로 띄워 자기 process group의 리더가 됩니다.
 * 상태 파일의 pid를 다른 process가 재사용하고 있으면 그 pid의 group이 없으므로 서버가 아닌 것으로 봅니다.
 */
function isServerAlive(pid) {
  if (process.platform === "win32") return isAlive(pid);
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

/** cwd에서 bd가 쓰는 workspace 디렉터리를 찾고, 없으면 실패합니다. */
function workspaceRootOf(cwd) {
  const root = findWorkspaceRoot(cwd);
  if (!root) throw new Error(`beads workspace를 찾지 못했습니다: ${cwd}`);
  return root;
}

function isWorkspaceRoot(root) {
  return findWorkspaceRoot(root) === root;
}

async function isHealthy(url) {
  try {
    return (await fetch(`${url}/api/health`)).ok;
  } catch {
    return false;
  }
}

async function readHealth(url) {
  try {
    return await (await fetch(`${url}/api/health`)).json();
  } catch {
    return null;
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

/**
 * 서버가 이 포트를 열 수 있고, 다른 서버가 localhost의 IPv4와 IPv6 어느 쪽에서도 요청을 받고 있지 않아야 비어 있다고 봅니다.
 * macOS는 다른 서버가 `::`나 `0.0.0.0`에서 같은 포트를 받고 있어도 `127.0.0.1`을 열게 해 주므로, 열어 보는 것만으로는 판정할 수 없습니다.
 * 열어 보는 probe에 연결 확인이 붙지 않도록 연결 확인을 먼저 끝냅니다.
 */
async function isPortAvailable(port) {
  return (
    !(await isAnswering(port, HOST)) &&
    !(await isAnswering(port, "::1")) &&
    (await canListenOn(port))
  );
}

function canListenOn(port) {
  return new Promise((resolvePort) => {
    const probe = createServer();
    probe.once("error", () => resolvePort(false));
    probe.once("listening", () => probe.close(() => resolvePort(true)));
    probe.listen(port, HOST);
  });
}

/** IPv6를 쓸 수 없는 환경처럼 연결이 어떤 이유로든 실패하면 받는 서버가 없다고 봅니다. */
function isAnswering(port, host) {
  return new Promise((resolveAnswer) => {
    const socket = connect(port, host);
    socket.once("connect", () => {
      socket.destroy();
      resolveAnswer(true);
    });
    socket.once("error", () => resolveAnswer(false));
  });
}

function sleep(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}
