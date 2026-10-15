import { spawn, spawnSync } from "node:child_process";
import { appendFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createDaemon } from "./daemon.js";

/**
 * next start 대신 띄우는 가짜 서버입니다. 시작한 pid를 기록하고, workspace 등록 API를 흉내 냅니다.
 * next start처럼 준비되기까지 시간이 걸리게 해 동시에 실행한 명령이 겹치게 합니다.
 */
const FAKE_SERVER = `
import { createServer } from "node:http";
import { appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
appendFileSync(process.env.PID_LOG, process.pid + "\\n");
const workspaces = [process.env.BEADS_DESK_WORKSPACE];
let current = workspaces[0];
const server = createServer(async (request, response) => {
  const send = (status, body) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  };
  if (request.url === "/api/health") {
    return send(200, { runtime: { bdVersion: process.env.BD_MISSING ? null : "bd version 1.3.1" } });
  }
  if (request.method === "GET") return send(200, { ok: true, data: { current, workspaces } });
  let raw = "";
  for await (const chunk of request) raw += chunk;
  const { path, select } = JSON.parse(raw);
  if (!existsSync(join(path, ".beads"))) return send(400, { ok: false, error: "not a workspace: " + path });
  if (!workspaces.includes(path)) workspaces.push(path);
  if (select) current = path;
  send(200, { ok: true, data: { current, workspaces } });
});
setTimeout(() => server.listen(Number(process.env.PORT), "127.0.0.1"), 500);
`;

let root: string;
let pidLog: string;
let serverScript: string;
const openBrowser = vi.fn<(url: string) => void>();
let printed: string[];
let nextPort = 39_600 + Math.floor(Math.random() * 300);

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-daemon-")));
  pidLog = join(root, "pids.log");
  serverScript = join(root, "fake-server.mjs");
  await writeFile(serverScript, FAKE_SERVER);
  openBrowser.mockReset();
  printed = [];
});

afterEach(async () => {
  for (const pid of await startedPids()) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // 이미 종료됐습니다.
    }
  }
});

function daemon(env: NodeJS.ProcessEnv = {}) {
  const defaultPort = nextPort;
  nextPort += 10;
  return createDaemon({
    runtimeDir: join(root, "runtime"),
    defaultPort,
    openBrowser,
    print: (message: string) => printed.push(message),
    serverCommand: (port: number, workspaceRoot: string) => ({
      command: process.execPath,
      args: [serverScript],
      env: {
        ...process.env,
        PORT: String(port),
        BEADS_DESK_WORKSPACE: workspaceRoot,
        PID_LOG: pidLog,
        ...env,
      },
    }),
  });
}

async function workspace(name: string): Promise<string> {
  const dir = join(root, name);
  await mkdir(join(dir, ".beads"), { recursive: true });
  return dir;
}

async function startedPids(): Promise<number[]> {
  const log = await readFile(pidLog, "utf8").catch(() => "");
  return log.split("\n").filter(Boolean).map(Number);
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** HTTP 요청을 받지 않고 계속 실행되는 process를 띄웁니다. 테스트가 끝나면 종료되도록 pid를 기록합니다. */
async function idleProcess(options: { detached: boolean }): Promise<number> {
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    ...options,
    stdio: "ignore",
  });
  await appendFile(pidLog, `${child.pid}\n`);
  return child.pid!;
}

async function writeServerState(pid: number): Promise<void> {
  await writeFile(
    join(root, "runtime", "server.json"),
    JSON.stringify({ pid, port: 1, url: "http://127.0.0.1:1" }),
  );
}

async function serverState(): Promise<{ url: string; port: number }> {
  return JSON.parse(await readFile(join(root, "runtime", "server.json"), "utf8"));
}

async function workspaces(): Promise<{ current: string; workspaces: string[] }> {
  const { url } = await serverState();
  return (await (await fetch(`${url}/api/workspaces`)).json()).data;
}

test("실행 중이면 새로 띄우지 않고 지금 디렉터리를 현재 workspace로 바꾼다", async () => {
  const commands = daemon();
  const first = await workspace("first");
  const second = await workspace("second");

  expect(await commands.start({ cwd: first, open: false })).toBe(0);
  expect(await commands.start({ cwd: second, open: false })).toBe(0);

  expect(await startedPids()).toHaveLength(1);
  expect(await workspaces()).toEqual({ current: second, workspaces: [first, second] });
  expect(await commands.stop()).toBe(0);
});

test("브라우저는 open을 줄 때만 연다", async () => {
  const commands = daemon();
  const first = await workspace("first");

  await commands.start({ cwd: first, open: false });
  await commands.start({ cwd: first, open: true });
  await commands.stop();

  expect(openBrowser.mock.calls).toEqual([[expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+$/)]]);
});

test("start를 동시에 실행해도 서버는 하나만 뜨고, stop으로 모두 끈다", async () => {
  const commands = daemon();
  const first = await workspace("first");
  const second = await workspace("second");

  await Promise.all([
    commands.start({ cwd: first, open: false }),
    commands.start({ cwd: second, open: false }),
  ]);
  const pids = await startedPids();
  const stopped = await commands.stop();
  await new Promise((resolve) => setTimeout(resolve, 200));

  expect(pids).toHaveLength(1);
  expect(stopped).toBe(0);
  expect(pids.filter(isAlive)).toEqual([]);
  expect(await commands.stop()).toBe(2);
});

test("restart는 지워진 workspace를 건너뛰고, 나머지를 같은 순서로 같은 포트에서 이어받는다", async () => {
  const commands = daemon();
  const [first, second, third] = [
    await workspace("first"),
    await workspace("second"),
    await workspace("third"),
  ];
  await commands.start({ cwd: first, open: false });
  await commands.start({ cwd: third, open: false });
  await commands.start({ cwd: second, open: false });
  const { port } = await serverState();
  await rm(third, { recursive: true });

  const code = await commands.restart({ open: false });

  expect(code).toBe(0);
  expect((await serverState()).port).toBe(port);
  expect(await workspaces()).toEqual({ current: second, workspaces: [first, second] });
  await commands.stop();
});

test("비정상 종료한 명령이 남긴 lock은 기다리지 않고 무시한다", async () => {
  const commands = daemon();
  const first = await workspace("first");
  const exited = spawnSync(process.execPath, ["-e", "process.exit(0)"]).pid;
  await writeFile(join(root, "runtime", "command.lock"), String(exited));

  const started = Date.now();
  expect(await commands.start({ cwd: first, open: false })).toBe(0);

  expect(Date.now() - started).toBeLessThan(5_000);
  await commands.stop();
});

test("응답하지 않는 서버도 stop으로 끈다", async () => {
  const commands = daemon();
  const hung = await idleProcess({ detached: true });
  await writeServerState(hung);

  expect(await commands.stop()).toBe(0);

  expect(isAlive(hung)).toBe(false);
});

test("상태 파일의 pid를 다른 process가 쓰고 있으면 그 process를 끄지 않고 상태 파일만 지운다", async () => {
  const commands = daemon();
  const unrelated = await idleProcess({ detached: false });
  await writeServerState(unrelated);

  expect(await commands.stop()).toBe(2);

  expect(isAlive(unrelated)).toBe(true);
  expect(await commands.stop()).toBe(2);
});

test("beads workspace가 아닌 디렉터리에서는 서버를 띄우지 않는다", async () => {
  const commands = daemon();
  const plain = join(root, "plain");
  await mkdir(plain);

  await expect(commands.start({ cwd: plain, open: false })).rejects.toThrow(
    `beads workspace를 찾지 못했습니다: ${plain}`,
  );

  expect(await startedPids()).toEqual([]);
});

test("하위 디렉터리에서 시작하면 상위의 beads workspace로 띄운다", async () => {
  const commands = daemon();
  const first = await workspace("first");
  const nested = join(first, "src", "deep");
  await mkdir(nested, { recursive: true });

  expect(await commands.start({ cwd: nested, open: false })).toBe(0);

  expect(await startedPids()).toHaveLength(1);
  expect(printed).toContain(`workspace: ${first}`);
  expect(await workspaces()).toEqual({ current: first, workspaces: [first] });
  await commands.stop();
});

test("서버가 bd를 실행하지 못하면 시작은 하되 경고를 출력한다", async () => {
  const commands = daemon({ BD_MISSING: "1" });
  const first = await workspace("first");

  expect(await commands.start({ cwd: first, open: false })).toBe(0);

  expect(printed).toContainEqual(expect.stringContaining("bd를 실행하지 못했습니다"));
  await commands.stop();
});

test("실행 중인 서버와 다른 포트를 지정하면 포트를 바꾸지 않고 restart를 안내한다", async () => {
  const commands = daemon();
  const first = await workspace("first");
  await commands.start({ cwd: first, open: false });
  const { port } = await serverState();

  expect(await commands.start({ cwd: first, port: port + 5, open: false })).toBe(0);

  expect((await serverState()).port).toBe(port);
  expect(printed).toContainEqual(expect.stringContaining(`restart --port ${port + 5}`));
  await commands.stop();
});

test.each([
  ["IPv6 전체 주소(::)", "::"],
  ["IPv4 전체 주소(0.0.0.0)", "0.0.0.0"],
])(
  "다른 서버가 %s로 기본 포트를 쓰고 있으면 다음 포트로 시작하고 그 사실을 알린다",
  async (_, host) => {
    const busy = nextPort;
    const commands = daemon();
    const first = await workspace("first");
    const other = await listen(busy, host);

    try {
      expect(await commands.start({ cwd: first, open: false })).toBe(0);

      expect((await serverState()).port).toBe(busy + 1);
      expect(printed).toContain(`${busy}번 포트가 사용 중이라 ${busy + 1}번 포트로 시작합니다.`);
      await commands.stop();
    } finally {
      other.close();
    }
  },
);

test("다른 서버가 IPv6로 쓰고 있는 포트를 지정하면 서버를 띄우지 않는다", async () => {
  const commands = daemon();
  const first = await workspace("first");
  const busy = nextPort;
  const other = await listen(busy, "::");

  try {
    await expect(commands.start({ cwd: first, port: busy, open: false })).rejects.toThrow(
      `${busy}번 포트가 사용 중입니다.`,
    );

    expect(await startedPids()).toEqual([]);
  } finally {
    other.close();
  }
});

/** 다른 서버처럼 이 주소에서 요청을 받아 포트를 차지합니다. next dev는 IPv6 전체 주소(`::`)에서 받습니다. */
async function listen(port: number, host: string): Promise<Server> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  return server;
}
