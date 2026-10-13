import { mkdir, mkdtemp, realpath, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  currentWorkspaceRoot,
  listWorkspaces,
  onWorkspacesChanged,
  registerWorkspace,
  selectWorkspace,
} from "./serverRuntime";

let launchRoot: string;
let otherRoot: string;
const originalWorkspace = process.env.BEADS_DESK_WORKSPACE;

async function beadsWorkspace(): Promise<string> {
  const root = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-runtime-")));
  await mkdir(join(root, ".beads"));
  return root;
}

beforeEach(async () => {
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("beads-desk.serverRuntime")];
  launchRoot = await beadsWorkspace();
  otherRoot = await beadsWorkspace();
  process.env.BEADS_DESK_WORKSPACE = launchRoot;
});

afterEach(() => {
  process.env.BEADS_DESK_WORKSPACE = originalWorkspace;
});

test("처음에는 실행한 디렉터리만 등록하고 현재 workspace로 둔다", () => {
  expect(currentWorkspaceRoot()).toBe(launchRoot);
  expect(listWorkspaces()).toEqual([launchRoot]);
});

test("하위 디렉터리를 등록하면 .beads가 있는 상위 디렉터리를 등록한다", async () => {
  const nested = join(otherRoot, "src", "app");
  await mkdir(nested, { recursive: true });

  expect(registerWorkspace(nested)).toBe(otherRoot);
  expect(registerWorkspace(otherRoot)).toBe(otherRoot);
  expect(listWorkspaces()).toEqual([launchRoot, otherRoot]);
  expect(currentWorkspaceRoot()).toBe(launchRoot);
});

test("symlink를 거친 경로도 실제 경로로 한 번만 등록한다", async () => {
  const link = join(await realpath(await mkdtemp(join(tmpdir(), "beads-desk-link-"))), "ws");
  await symlink(otherRoot, link);

  expect(registerWorkspace(link)).toBe(otherRoot);
  expect(registerWorkspace(otherRoot)).toBe(otherRoot);
  expect(listWorkspaces()).toEqual([launchRoot, otherRoot]);
});

test("beads workspace가 아니거나 없는 디렉터리는 등록하지 않는다", async () => {
  const plain = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-plain-")));

  expect(registerWorkspace(plain)).toBeNull();
  expect(registerWorkspace(join(plain, "missing"))).toBeNull();
  expect(registerWorkspace("relative/path")).toBeNull();
  expect(listWorkspaces()).toEqual([launchRoot]);
});

test("새 workspace를 등록하거나 현재 workspace를 바꾸면 구독자에게 알린다", () => {
  const listener = vi.fn<() => void>();
  const stop = onWorkspacesChanged(listener);

  registerWorkspace(otherRoot);
  registerWorkspace(otherRoot);
  expect(selectWorkspace(otherRoot)).toBe(true);
  expect(selectWorkspace(otherRoot)).toBe(true);
  stop();
  selectWorkspace(launchRoot);

  expect(currentWorkspaceRoot()).toBe(launchRoot);
  expect(listener).toHaveBeenCalledTimes(2);
});

test("등록하지 않은 경로는 고르지 않는다", () => {
  expect(selectWorkspace(otherRoot)).toBe(false);
  expect(currentWorkspaceRoot()).toBe(launchRoot);
});
