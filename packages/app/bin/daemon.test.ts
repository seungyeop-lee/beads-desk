import { spawn, spawnSync } from "node:child_process";
import { appendFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createDaemon } from "./daemon.js";

/**
 * next start 대신 띄우는 가짜 서버입니다. 시작한 pid를 기록하고, workspace 등록 API를 흉내 냅니다.
 * next start처럼 준비되기까지 시간이 걸리게 해 동시에 실행한 명령이 겹치게 합니다.
 */
const FAKE_SERVER = `
import { createServer } from "node:http";
import { appendFileSync } from "node:fs";
import { basename } from "node:path";
appendFileSync(process.env.PID_LOG, process.pid + "\\n");
const roots = [process.env.BEADS_DESK_WORKSPACE];
const entry = (root) => ({ root, slug: basename(root) });
const server = createServer(async (request, response) => {
  const send = (status, body) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  };
  if (request.url === "/api/health") {
    return send(200, { runtime: { bdVersion: process.env.BD_MISSING ? null : "bd version 1.3.1" } });
  }
  if (request.method === "GET") return send(200, { ok: true, data: { workspaces: roots.map(entry) } });
  let raw = "";
  for await (const chunk of request) raw += chunk;
  const { path } = JSON.parse(raw);
  if (!roots.includes(path)) roots.push(path);
  send(200, { ok: true, data: { registered: entry(path), workspaces: roots.map(entry) } });
});
setTimeout(() => server.listen(Number(process.env.PORT), "127.0.0.1"), 500);
`;

let root: string;
let pidLog: string;
let serverScript: string;
const openBrowser = vi.fn<(url: string) => void>();
let printed: string[];
/**
 * 테스트 포트는 OS가 나가는 연결에 배정하는 ephemeral 포트 범위(Linux 32768~60999, macOS와 Windows 49152~65535) 밖에서 고릅니다.
 * 같은 기기의 어떤 연결이든 그 포트를 local 포트로 쓰고 있거나 TIME_WAIT로 남기고 있으면 listen이 EADDRINUSE로 실패합니다.
 * 시작 포트는 32000 미만이고 daemon 하나가 포트 10개를 차지하므로, 이 파일에서 daemon을 76개까지 만들어도 32768을 넘지 않습니다.
 */
let nextPort = 20_000 + Math.floor(Math.random() * 12_000);

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

function daemon(env: NodeJS.ProcessEnv = {}, platform?: NodeJS.Platform) {
  const defaultPort = nextPort;
  nextPort += 10;
  return createDaemon({
    runtimeDir: join(root, "runtime"),
    defaultPort,
    platform,
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
  // bd는 설정 파일이 있는 `.beads`만 workspace로 봅니다.
  await writeFile(join(dir, ".beads", "config.yaml"), "");
  return dir;
}

// git hook 안에서 실행하면 GIT_DIR 등이 이 저장소를 가리키므로 GIT_ 환경 변수를 빼고 실행합니다.
function git(cwd: string, ...args: string[]): void {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
  const result = spawnSync("git", args, { cwd, env, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
}

/** `.beads`에 redirect 파일만 두어, bd가 redirect에 적힌 `.beads`의 DB를 쓰게 하는 디렉터리를 만듭니다. */
async function redirectedWorkspace(name: string, redirect: string): Promise<string> {
  const dir = join(root, name);
  await mkdir(join(dir, ".beads"), { recursive: true });
  await writeFile(join(dir, ".beads", "redirect"), `${redirect}\n`);
  return dir;
}

/** main 디렉터리를 git 저장소로 만들고 그 worktree를 만듭니다. worktree에는 `.beads`가 없습니다. */
async function gitWorktree(main: string, name: string): Promise<string> {
  const worktree = join(root, name);
  git(main, "init", "--quiet");
  git(
    main,
    "-c",
    "user.name=test",
    "-c",
    "user.email=test@example.com",
    "commit",
    "--quiet",
    "--allow-empty",
    "-m",
    "init",
  );
  git(main, "worktree", "add", "--quiet", worktree);
  return worktree;
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

/** 서버에 등록한 workspace 디렉터리를 등록한 순서대로 돌려줍니다. */
async function workspaces(): Promise<string[]> {
  const { url } = await serverState();
  const body = await (await fetch(`${url}/api/workspaces`)).json();
  return body.data.workspaces.map(({ root }: { root: string }) => root);
}

test("시작하면 그 workspace의 화면 주소를 출력한다", async () => {
  const commands = daemon();
  const first = await workspace("first");

  expect(await commands.start({ cwd: first, open: false })).toBe(0);

  const { url } = await serverState();
  expect(printed).toContain(`URL: ${url}/w/${basename(first)}`);
  await commands.stop();
});

test("실행 중이면 새로 띄우지 않고 지금 디렉터리를 등록해 그 workspace의 화면 주소를 출력한다", async () => {
  const commands = daemon();
  const first = await workspace("first");
  const second = await workspace("second");

  expect(await commands.start({ cwd: first, open: false })).toBe(0);
  expect(await commands.start({ cwd: second, open: false })).toBe(0);

  const { url } = await serverState();
  expect(await startedPids()).toHaveLength(1);
  expect(await workspaces()).toEqual([first, second]);
  expect(printed).toContain(`URL: ${url}/w/${basename(second)}`);
  expect(await commands.stop()).toBe(0);
});

test("브라우저는 open을 줄 때만 연다", async () => {
  const commands = daemon();
  const first = await workspace("first");

  await commands.start({ cwd: first, open: false });
  await commands.start({ cwd: first, open: true });
  await commands.stop();

  expect(openBrowser.mock.calls).toEqual([
    [expect.stringMatching(new RegExp(`^http://127\\.0\\.0\\.1:\\d+/w/${basename(first)}$`))],
  ]);
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

  const code = await commands.restart({ cwd: second, open: false });

  expect(code).toBe(0);
  expect((await serverState()).port).toBe(port);
  expect(await workspaces()).toEqual([first, second]);
  expect(printed.at(-1)).toBe(`URL: http://127.0.0.1:${port}/w/${basename(second)}`);
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
    `No beads workspace found: ${plain}`,
  );

  expect(await startedPids()).toEqual([]);
});

test("설정이나 DB 파일이 없는 .beads만 있는 디렉터리에서는 서버를 띄우지 않는다", async () => {
  const commands = daemon();
  // 홈 디렉터리의 `~/.beads`처럼 bd가 전역 상태만 두는 디렉터리입니다.
  const home = join(root, "home");
  await mkdir(join(home, ".beads", "shared-server"), { recursive: true });

  await expect(commands.start({ cwd: home, open: false })).rejects.toThrow(
    `No beads workspace found: ${home}`,
  );

  expect(await startedPids()).toEqual([]);
});

test("git worktree에서 시작하면 worktree 최상위 디렉터리로 띄우고, restart도 이어받는다", async () => {
  const commands = daemon();
  const worktree = await gitWorktree(await workspace("worktree-main"), "worktree");
  const nested = join(worktree, "packages", "app");
  await mkdir(nested, { recursive: true });

  expect(await commands.start({ cwd: nested, open: false })).toBe(0);
  expect(printed).toContain(`workspace: ${worktree}`);
  expect(await commands.restart({ cwd: nested, open: false })).toBe(0);

  expect(await workspaces()).toEqual([worktree]);
  await commands.stop();
});

test.each([
  ["절대 경로", (hub: string) => join(hub, ".beads")],
  // bd는 상대 경로를 `.beads`가 아니라 그 `.beads`를 둔 디렉터리 기준으로 해석합니다.
  ["상대 경로", () => "../hub/.beads"],
])(
  ".beads에 %s redirect만 있는 git 저장소에서 시작하면 redirect 대상이 아니라 그 저장소로 띄운다",
  async (_, redirect) => {
    const commands = daemon();
    const hub = await workspace("hub");
    const linked = await redirectedWorkspace("linked", redirect(hub));
    git(linked, "init", "--quiet");

    expect(await commands.start({ cwd: linked, open: false })).toBe(0);

    expect(printed).toContain(`workspace: ${linked}`);
    expect(await workspaces()).toEqual([linked]);
    await commands.stop();
  },
);

test("redirect만 있는 git 저장소의 worktree에서 시작하면 worktree 최상위 디렉터리로 띄운다", async () => {
  const commands = daemon();
  const hub = await workspace("hub");
  const worktree = await gitWorktree(
    await redirectedWorkspace("linked", join(hub, ".beads")),
    "worktree",
  );

  expect(await commands.start({ cwd: worktree, open: false })).toBe(0);

  expect(await workspaces()).toEqual([worktree]);
  await commands.stop();
});

test.each([
  ["redirect 대상 디렉터리가 없으면", () => join(root, "missing", ".beads")],
  [
    "redirect 대상에 설정이나 DB 파일이 없으면",
    async () => {
      const target = join(root, "empty", ".beads");
      await mkdir(target, { recursive: true });
      return target;
    },
  ],
  // bd는 redirect가 가리키는 `.beads`의 redirect를 다시 따라가지 않습니다.
  [
    "redirect 대상에도 redirect만 있으면",
    async () => {
      const hub = await workspace("hub");
      const middle = await redirectedWorkspace("middle", join(hub, ".beads"));
      return join(middle, ".beads");
    },
  ],
])("%s 서버를 띄우지 않는다", async (_, redirect) => {
  const commands = daemon();
  const linked = await redirectedWorkspace("linked", await redirect());

  await expect(commands.start({ cwd: linked, open: false })).rejects.toThrow(
    `No beads workspace found: ${linked}`,
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
  expect(await workspaces()).toEqual([first]);
  await commands.stop();
});

test.each([
  [
    "win32",
    "Warning: the server could not run bd. Make sure bd.exe is on PATH, or set BD_BIN to the full path of bd.exe.",
  ],
  [
    "linux",
    "Warning: the server could not run bd. Make sure bd is on PATH, or set BD_BIN to its path.",
  ],
] as const)(
  "%s에서 서버가 bd를 실행하지 못하면 시작은 하되 그 플랫폼의 경고를 출력한다",
  async (platform, warning) => {
    const commands = daemon({ BD_MISSING: "1" }, platform);
    const first = await workspace("first");

    expect(await commands.start({ cwd: first, open: false })).toBe(0);

    expect(printed).toContain(warning);
    await commands.stop();
  },
);

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
      expect(printed).toContain(`Port ${busy} is already in use. Starting on port ${busy + 1}.`);
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
      `Port ${busy} is already in use.`,
    );

    expect(await startedPids()).toEqual([]);
  } finally {
    other.close();
  }
});

/** 다른 서버처럼 이 주소에서 요청을 받아 포트를 차지합니다. next dev는 IPv6 전체 주소(`::`)에서 받습니다. */
async function listen(port: number, host: string): Promise<Server> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  return server;
}
