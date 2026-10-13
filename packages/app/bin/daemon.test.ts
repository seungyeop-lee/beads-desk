import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
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
  if (request.url === "/api/health") return send(200, {});
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
let nextPort = 39_600 + Math.floor(Math.random() * 300);

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-daemon-")));
  pidLog = join(root, "pids.log");
  serverScript = join(root, "fake-server.mjs");
  await writeFile(serverScript, FAKE_SERVER);
  openBrowser.mockReset();
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

function daemon() {
  const defaultPort = nextPort;
  nextPort += 10;
  return createDaemon({
    runtimeDir: join(root, "runtime"),
    defaultPort,
    openBrowser,
    print: () => {},
    serverCommand: (port: number, workspaceRoot: string) => ({
      command: process.execPath,
      args: [serverScript],
      env: {
        ...process.env,
        PORT: String(port),
        BEADS_DESK_WORKSPACE: workspaceRoot,
        PID_LOG: pidLog,
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
