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
 * @param {NodeJS.Platform} [options.platform] 서버가 bd를 실행하지 못했을 때 출력할 안내를 고르는 플랫폼입니다. 테스트에서 다른 플랫폼의 안내를 확인할 때만 지정합니다.
 */
export function createDaemon({
  runtimeDir,
  serverCommand,
  openBrowser,
  defaultPort,
  print = console.log,
  platform = process.platform,
}) {
  mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
  const statePath = join(runtimeDir, "server.json");
  const logPath = join(runtimeDir, "server.log");
  const lockPath = join(runtimeDir, "command.lock");

  return {
    /**
     * 이미 실행 중이면 새로 띄우지 않고 cwd를 workspace로 등록합니다. 출력하고 여는 URL은 그 workspace의 화면 주소입니다.
     * 이미 열린 탭은 보던 workspace를 그대로 봅니다.
     *
     * @param {{ cwd: string; port?: number; open: boolean }} options
     */
    start: ({ cwd, port, open }) =>
      withLock(async () => {
        const root = workspaceRootOf(cwd);
        const running = await runningServer();
        if (running) {
          const { registered } = await registerWorkspace(running.url, root);
          const url = workspaceUrl(running.url, registered.slug);
          print(`Added workspace to the running server: ${registered.root}`);
          print(`URL: ${url}`);
          if (port && port !== running.port) {
            print(
              `The server is already running on port ${running.port}, so port ${port} was not applied. To change the port, run: bd-desk restart --port ${port}`,
            );
          }
          if (open) openBrowser(url);
          return 0;
        }
        const server = await launch(root, port);
        // 서버가 시작할 때 등록한 workspace를 다시 등록해 화면 주소에 쓰는 이름을 받습니다.
        const { registered } = await registerWorkspace(server.url, root);
        const url = workspaceUrl(server.url, registered.slug);
        print(`workspace: ${root}`);
        print(`URL: ${url}`);
        print("To stop the server, run: bd-desk stop");
        if (open) openBrowser(url);
        return 0;
      }),

    /** 서버가 응답하지 않아도 끌 수 있도록 응답을 기다리지 않고 종료합니다. */
    stop: () =>
      withLock(async () => {
        const state = readState();
        if (!state || !isServerAlive(state.pid)) {
          rmSync(statePath, { force: true });
          print("No beads-desk server is running.");
          return 2;
        }
        await terminate(state.pid);
        print("Server stopped.");
        return 0;
      }),

    /**
     * 같은 포트로 다시 시작하고, 등록한 workspace를 같은 순서로 등록합니다. 등록 순서가 같으면 화면 주소도 그대로입니다.
     * cwd가 등록한 workspace면 그 workspace의 화면 주소를, 아니면 workspace를 고르는 서버 주소를 출력합니다.
     *
     * @param {{ cwd: string; port?: number; open: boolean }} options
     */
    restart: ({ cwd, port, open }) =>
      withLock(async () => {
        const running = await runningServer();
        if (!running) {
          const root = workspaceRootOf(cwd);
          print("No server is running. Starting a new one.");
          const server = await launch(root, port);
          const { registered } = await registerWorkspace(server.url, root);
          const url = workspaceUrl(server.url, registered.slug);
          print(`URL: ${url}`);
          if (open) openBrowser(url);
          return 0;
        }
        const list = await readWorkspaces(running.url);
        await terminate(running.pid);

        // 그사이 지워진 workspace는 건너뜁니다. 남은 것이 없으면 처음 등록한 workspace로 띄웁니다.
        const existing = [];
        const missing = [];
        for (const { root } of list.workspaces) {
          (isWorkspaceRoot(root) ? existing : missing).push(root);
        }
        const [first = list.workspaces[0].root, ...rest] = existing;
        const server = await launch(first, port ?? running.port);
        for (const root of rest) {
          await registerWorkspace(server.url, root);
        }
        for (const root of missing) {
          print(`Workspace not found, so it was not registered again: ${root}`);
        }
        const { workspaces } = await readWorkspaces(server.url);
        const here = workspaces.find(({ root }) => root === findWorkspaceRoot(cwd));
        const url = here ? workspaceUrl(server.url, here.slug) : server.url;
        print(`URL: ${url}`);
        if (open) openBrowser(url);
        return 0;
      }),
  };

  /** 서버를 background로 시작하고, 요청을 받을 수 있을 때까지 기다립니다. */
  async function launch(workspaceRoot, requestedPort) {
    if (requestedPort && !(await isPortAvailable(requestedPort))) {
      throw new Error(`Port ${requestedPort} is already in use.`);
    }
    const port = requestedPort ?? (await findAvailablePort(defaultPort));
    if (!requestedPort && port !== defaultPort) {
      print(`Port ${defaultPort} is already in use. Starting on port ${port}.`);
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
      throw new Error(`${error.message} Log: ${logPath}`, { cause: error });
    }
    if ((await readHealth(url))?.runtime?.bdVersion === null) {
      // Windows의 서버는 npm이 만든 bd.cmd shim만 bd.exe로 풀어 실행하고, pnpm이나 volta의 shim은 BD_BIN에 지정해도 실행하지 못합니다.
      // 그래서 Windows에서는 BD_BIN에 bd.exe 경로를 지정하라고 안내합니다.
      print(
        platform === "win32"
          ? "Warning: the server could not run bd. Make sure bd.exe is on PATH, or set BD_BIN to the full path of bd.exe."
          : "Warning: the server could not run bd. Make sure bd is on PATH, or set BD_BIN to its path.",
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
        `The running server (pid ${state.pid}) is not responding. Stop it with bd-desk stop, then start again.`,
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
        throw new Error("Timed out waiting for another bd-desk command to finish.");
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

/**
 * pid(음수면 process group)가 살아 있는지 확인합니다.
 * process가 존재해도 신호를 보낼 권한이 없으면 EPERM이 나므로 살아 있는 것으로 봅니다.
 */
function isAlive(target) {
  try {
    process.kill(target, 0);
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
  // windows에는 process group이 없으므로 pid로 확인합니다.
  return isAlive(process.platform === "win32" ? pid : -pid);
}

/** cwd에서 bd가 쓰는 workspace 디렉터리를 찾고, 없으면 실패합니다. */
function workspaceRootOf(cwd) {
  const root = findWorkspaceRoot(cwd);
  if (!root) throw new Error(`No beads workspace found: ${cwd}`);
  return root;
}

function isWorkspaceRoot(root) {
  return findWorkspaceRoot(root) === root;
}

/** 서버 상태 본문을 읽어 돌려줍니다. 서버가 응답하지 않으면 null을 돌려줍니다. */
async function readHealth(url) {
  try {
    const response = await fetch(`${url}/api/health`);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

async function waitForServer(url, pid) {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) throw new Error("The server exited before it was ready.");
    if ((await readHealth(url)) !== null) return;
    await sleep(250);
  }
  throw new Error("Timed out waiting for the server to be ready.");
}

/** 서버의 workspace 화면 주소입니다. 서버의 `workspaceHref`(`src/shared/contract/workspaces.ts`)와 같은 형식입니다. */
function workspaceUrl(url, slug) {
  return `${url}/w/${encodeURIComponent(slug)}`;
}

async function registerWorkspace(url, path) {
  const response = await fetch(`${url}/api/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
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
  throw new Error("No free local port found.");
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
