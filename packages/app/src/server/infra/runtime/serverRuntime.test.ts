import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, realpath, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  findWorkspace,
  listWorkspaces,
  onWorkspacesChanged,
  registerWorkspace,
} from "./serverRuntime";

let launchRoot: string;
let otherRoot: string;

async function beadsWorkspace(): Promise<string> {
  const root = await tempDir("beads-desk-runtime-");
  await initBeads(root);
  return root;
}

async function tempDir(prefix: string): Promise<string> {
  return realpath(await mkdtemp(join(tmpdir(), prefix)));
}

// bd는 설정 파일이 있는 `.beads`만 workspace로 봅니다.
async function initBeads(dir: string): Promise<void> {
  await mkdir(join(dir, ".beads"), { recursive: true });
  await writeFile(join(dir, ".beads", "config.yaml"), "");
}

// git hook 안에서 실행하면 GIT_DIR 등이 이 저장소를 가리키므로 GIT_ 환경 변수를 빼고 실행합니다.
function git(cwd: string, ...args: string[]): void {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
  const result = spawnSync("git", args, { cwd, env, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
}

/** `.beads`가 있는 git 저장소와, `.beads`가 없는 그 저장소의 worktree를 만듭니다. */
async function gitWorktree(): Promise<{ main: string; worktree: string }> {
  const base = await tempDir("beads-desk-git-");
  const main = join(base, "main");
  const worktree = join(base, "worktree");
  await mkdir(main);
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
  await initBeads(main);
  git(main, "worktree", "add", "--quiet", worktree);
  return { main, worktree };
}

beforeEach(async () => {
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("beads-desk.serverRuntime")];
  launchRoot = await beadsWorkspace();
  otherRoot = await beadsWorkspace();
  vi.stubEnv("BEADS_DESK_WORKSPACE", launchRoot);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function roots(): string[] {
  return listWorkspaces().map((workspace) => workspace.root);
}

test("처음에는 실행한 디렉터리만 등록한다", () => {
  expect(roots()).toEqual([launchRoot]);
});

test("등록한 workspace마다 화면 주소에 쓰는 이름을 정하고, 그 이름으로 찾는다", async () => {
  const sameName = join(await tempDir("beads-desk-runtime-"), basename(launchRoot));
  await initBeads(sameName);
  registerWorkspace(sameName);

  expect(listWorkspaces()).toEqual([
    { root: launchRoot, slug: basename(launchRoot) },
    { root: sameName, slug: `${basename(launchRoot)}-2` },
  ]);
  expect(registerWorkspace(sameName)).toEqual({
    root: sameName,
    slug: `${basename(launchRoot)}-2`,
  });
  expect(findWorkspace(`${basename(launchRoot)}-2`)?.root).toBe(sameName);
  expect(findWorkspace("missing")).toBeNull();
});

test("하위 디렉터리를 등록하면 .beads가 있는 상위 디렉터리를 등록한다", async () => {
  const nested = join(otherRoot, "src", "app");
  await mkdir(nested, { recursive: true });

  expect(registerWorkspace(nested)?.root).toBe(otherRoot);
  expect(registerWorkspace(otherRoot)?.root).toBe(otherRoot);
  expect(roots()).toEqual([launchRoot, otherRoot]);
});

test("symlink를 거친 경로도 실제 경로로 한 번만 등록한다", async () => {
  const link = join(await realpath(await mkdtemp(join(tmpdir(), "beads-desk-link-"))), "ws");
  await symlink(otherRoot, link);

  expect(registerWorkspace(link)?.root).toBe(otherRoot);
  expect(registerWorkspace(otherRoot)?.root).toBe(otherRoot);
  expect(roots()).toEqual([launchRoot, otherRoot]);
});

test("git worktree에서는 main 저장소의 .beads를 쓰는 worktree 최상위 디렉터리를 등록한다", async () => {
  const { main, worktree } = await gitWorktree();
  const nested = join(worktree, "packages", "app");
  await mkdir(nested, { recursive: true });

  expect(registerWorkspace(nested)?.root).toBe(worktree);
  expect(registerWorkspace(main)?.root).toBe(main);
  expect(roots()).toEqual([launchRoot, worktree, main]);
});

test("worktree에서 띄우면 worktree 최상위 디렉터리를 등록한다", async () => {
  const { worktree } = await gitWorktree();
  const nested = join(worktree, "packages", "app");
  await mkdir(nested, { recursive: true });
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("beads-desk.serverRuntime")];
  vi.stubEnv("BEADS_DESK_WORKSPACE", nested);

  expect(roots()).toEqual([worktree]);
});

test("설정이나 DB 파일이 없는 .beads는 workspace로 보지 않는다", async () => {
  // 홈 디렉터리의 `~/.beads`처럼 bd가 전역 상태만 두는 디렉터리입니다.
  const home = await tempDir("beads-desk-home-");
  await mkdir(join(home, ".beads", "shared-server"), { recursive: true });
  const project = join(home, "project");
  await mkdir(project);

  expect(registerWorkspace(project)).toBeNull();
});

test("git 저장소 바깥 상위의 .beads는 찾지 않는다", async () => {
  const outer = await beadsWorkspace();
  const repo = join(outer, "repo");
  await mkdir(join(repo, "src"), { recursive: true });
  git(repo, "init", "--quiet");

  expect(registerWorkspace(join(repo, "src"))).toBeNull();
});

test("beads workspace가 아니거나 없는 디렉터리는 등록하지 않는다", async () => {
  const plain = await tempDir("beads-desk-plain-");

  expect(registerWorkspace(plain)).toBeNull();
  expect(registerWorkspace(join(plain, "missing"))).toBeNull();
  expect(registerWorkspace("relative/path")).toBeNull();
  expect(roots()).toEqual([launchRoot]);
});

test("새 workspace를 등록하면 구독자에게 알린다", async () => {
  const listener = vi.fn<() => void>();
  const stop = onWorkspacesChanged(listener);

  registerWorkspace(otherRoot);
  registerWorkspace(otherRoot);
  stop();
  registerWorkspace(await beadsWorkspace());

  expect(listener).toHaveBeenCalledOnce();
});
