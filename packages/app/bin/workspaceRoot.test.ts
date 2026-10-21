import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { findWorkspaceRoot } from "./workspaceRoot.js";

let root: string;

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-workspace-root-")));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function workspace(dir: string): Promise<void> {
  await mkdir(join(dir, ".beads"), { recursive: true });
  await writeFile(join(dir, ".beads", "config.yaml"), "");
}

// git hook 안에서 실행하면 GIT_DIR 등이 이 저장소를 가리키므로 GIT_ 환경 변수를 빼고 실행합니다.
function gitInit(cwd: string): void {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
  const result = spawnSync("git", ["init", "--quiet"], { cwd, env, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
}

// 대소문자만 다른 경로로 같은 디렉터리를 가리킬 수 있는 파일 시스템(Windows, macOS 기본 설정)에서만 확인할 수 있습니다.
function caseInsensitive(dir: string): boolean {
  return existsSync(dir.toLowerCase());
}

test("Windows에서는 대소문자만 다른 하위 디렉터리 경로로 찾아도 실제 대소문자의 workspace 경로를 돌려준다", async (context) => {
  const project = join(root, "Project");
  await workspace(project);
  await mkdir(join(project, "Nested"));
  context.skip(!caseInsensitive(project), "대소문자를 구분하는 파일 시스템입니다.");

  expect(findWorkspaceRoot(join(root, "project", "nested"), "win32")).toBe(project);
});

test("Windows에서는 대소문자만 다른 경로로 찾아도 .beads가 없는 git 저장소의 최상위에서 멈춘다", async (context) => {
  const project = join(root, "Project");
  await workspace(project);
  const repository = join(project, "Inner");
  await mkdir(repository);
  gitInit(repository);
  context.skip(!caseInsensitive(project), "대소문자를 구분하는 파일 시스템입니다.");

  expect(findWorkspaceRoot(join(root, "project", "inner"), "win32")).toBeNull();
});
