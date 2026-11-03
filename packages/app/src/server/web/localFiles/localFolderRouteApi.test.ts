import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import type { ApiResponse } from "@/shared/contract/apiResponse";
import {
  LOCAL_FOLDER_PATH,
  localFolderApiPath,
  type LocalFolderPage,
} from "@/shared/contract/localFiles";
import { WORKSPACE_QUERY } from "@/shared/contract/workspaces";
import { handleLocalFolderRequest } from "./localFolderRouteApi";

let parent: string;
let root: string;
vi.mock("@/server/infra/runtime/serverRuntime", () => ({
  findWorkspace: (slug: string) => (slug === "repo" ? { root, slug } : null),
}));
vi.mock("@/server/web/locale/requestLocale", () => ({ requestLocale: async () => "ko" }));

const BASE_TIME = new Date("2026-11-01T00:00:00Z").getTime() / 1000;

async function list(path: string, cursor: string | null = null) {
  const response = await handleLocalFolderRequest(
    new Request(`http://localhost${localFolderApiPath(path, cursor)}&${WORKSPACE_QUERY}=repo`),
  );
  return { status: response.status, body: (await response.json()) as ApiResponse<LocalFolderPage> };
}

async function page(path: string, cursor: string | null = null): Promise<LocalFolderPage> {
  const { status, body } = await list(path, cursor);
  expect(status).toBe(200);
  if (!body.ok) throw new Error(body.error);
  return body.data;
}

/** 수정 시각을 BASE_TIME에서 seconds초 뒤로 정합니다. */
const touch = (path: string, seconds: number) =>
  utimes(path, BASE_TIME + seconds, BASE_TIME + seconds);

// git hook 안에서 실행하면 GIT_DIR 등이 hook을 실행한 저장소를 가리키므로 GIT_ 환경 변수를 뺍니다.
function unsetGitEnv(): void {
  for (const key of Object.keys(process.env))
    if (key.startsWith("GIT_")) vi.stubEnv(key, undefined);
}

beforeAll(async () => {
  unsetGitEnv();
  // 허용 밖 symlink를 만들려면 fixture가 기본 허용 루트(임시 디렉터리) 밖이어야 하므로 프로젝트 디렉터리 아래에 만듭니다.
  // 그 경로는 이 저장소 안이라, workspace를 git 저장소로 만들어 서버가 이 저장소의 worktree를 허용하지 않게 합니다.
  parent = await mkdtemp(join(process.cwd(), "beads-desk-local-folder-"));
  root = join(parent, "repo");
  await mkdir(root);
  execFileSync("git", ["-C", root, "init", "--quiet"]);
  await mkdir(join(parent, "outside", "secret folder"), { recursive: true });
  await writeFile(join(parent, "outside", "secret.md"), "outside secret");
});
beforeEach(() => {
  unsetGitEnv();
  vi.stubEnv("BEADS_DESK_LOCAL_FILE_ROOTS", undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
});
afterAll(async () => {
  await rm(parent, { recursive: true, force: true });
});

test("폴더를 먼저, 폴더와 파일을 각각 수정 시각 최신순으로 200개씩 돌려주고 마지막 묶음에는 cursor가 없다", async () => {
  const folder = join(root, "많은 항목");
  await mkdir(folder);
  const files = Array.from(
    { length: 401 },
    (_, index) => `파일 ${String(index).padStart(3, "0")}.log`,
  );
  for (const [index, name] of files.entries()) {
    await writeFile(join(folder, name), "x".repeat(index));
    await touch(join(folder, name), index);
  }
  // 수정 시각이 같은 두 파일은 이름순으로 놓입니다.
  await writeFile(join(folder, "같은 시각 b.log"), "");
  await writeFile(join(folder, "같은 시각 a.log"), "");
  await touch(join(folder, "같은 시각 b.log"), 1000);
  await touch(join(folder, "같은 시각 a.log"), 1000);
  // 파일보다 오래된 폴더도 파일보다 위에 놓입니다.
  for (const [name, seconds] of [
    ["오래된 폴더", -20],
    ["새 폴더", -10],
  ] as const) {
    await mkdir(join(folder, name));
    await touch(join(folder, name), seconds);
  }

  const first = await page(folder);
  expect(first.total).toBe(405);
  expect(first.entries).toHaveLength(200);
  expect(first.entries.slice(0, 5)).toEqual([
    {
      kind: "folder",
      name: "새 폴더",
      path: join(folder, "새 폴더"),
      modifiedAt: (BASE_TIME - 10) * 1000,
    },
    {
      kind: "folder",
      name: "오래된 폴더",
      path: join(folder, "오래된 폴더"),
      modifiedAt: (BASE_TIME - 20) * 1000,
    },
    expect.objectContaining({ kind: "file", name: "같은 시각 a.log", size: 0 }),
    expect.objectContaining({ kind: "file", name: "같은 시각 b.log", size: 0 }),
    {
      kind: "file",
      name: "파일 400.log",
      path: join(folder, "파일 400.log"),
      size: 400,
      modifiedAt: (BASE_TIME + 400) * 1000,
    },
  ]);
  expect(first.next).not.toBeNull();

  const second = await page(folder, first.next);
  expect(second.entries).toHaveLength(200);
  expect(second.entries[0]!.name).toBe("파일 204.log");
  const last = await page(folder, second.next);
  expect(last.entries.map((entry) => entry.name)).toEqual([
    "파일 004.log",
    "파일 003.log",
    "파일 002.log",
    "파일 001.log",
    "파일 000.log",
  ]);
  expect(last.next).toBeNull();
});

test("첫 묶음을 받은 뒤 새 파일이 생기거나 받은 항목이 수정돼도 다음 묶음에 이미 받은 항목이 다시 나오지 않는다", async () => {
  const folder = join(root, "바뀌는 폴더");
  await mkdir(folder);
  const files = Array.from(
    { length: 250 },
    (_, index) => `기록 ${String(index).padStart(3, "0")}.txt`,
  );
  for (const [index, name] of files.entries()) {
    await writeFile(join(folder, name), "");
    await touch(join(folder, name), index);
  }

  const first = await page(folder);
  await writeFile(join(folder, "새 기록.txt"), "");
  await touch(join(folder, first.entries[10]!.name), 5000);
  const second = await page(folder, first.next);

  const names = [...first.entries, ...second.entries].map((entry) => entry.name);
  expect(new Set(names).size).toBe(names.length);
  expect(names.toSorted()).toEqual(files);
  expect(second.total).toBe(251);
  expect(second.next).toBeNull();
});

test("이름이 .으로 시작하는 항목은 목록과 전체 항목 수에서 뺀다", async () => {
  const folder = join(root, "숨김 항목");
  await mkdir(join(folder, ".git"), { recursive: true });
  await writeFile(join(folder, ".env"), "secret");
  await writeFile(join(folder, "보이는 파일.md"), "");

  const result = await page(`${folder}/`);
  expect(result.entries.map((entry) => entry.name)).toEqual(["보이는 파일.md"]);
  expect(result.total).toBe(1);
});

test("허용 루트 밖을 가리키거나 대상이 없는 symlink는 열 수 없는 항목으로, 안을 가리키는 symlink는 대상의 항목으로 돌려준다", async () => {
  const folder = join(root, "링크");
  await mkdir(join(root, "안쪽 폴더"));
  await writeFile(join(root, "안쪽 파일.md"), "inside");
  await mkdir(folder);
  await symlink(join(parent, "outside", "secret.md"), join(folder, "밖 파일"));
  await symlink(join(parent, "outside", "secret folder"), join(folder, "밖 폴더"));
  await symlink(join(root, "없는 대상"), join(folder, "끊긴 링크"));
  await symlink(join(root, "안쪽 파일.md"), join(folder, "안 파일"));
  await symlink(join(root, "안쪽 폴더"), join(folder, "안 폴더"));

  const entries = (await page(folder)).entries;
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  for (const name of ["밖 파일", "밖 폴더", "끊긴 링크"]) {
    expect(byName.get(name)).toEqual({ kind: "blocked", name, modifiedAt: expect.any(Number) });
  }
  expect(byName.get("안 파일")).toMatchObject({
    kind: "file",
    path: join(folder, "안 파일"),
    size: 6,
  });
  expect(byName.get("안 폴더")).toMatchObject({ kind: "folder", path: join(folder, "안 폴더") });
  // 허용 루트 안을 가리키는 폴더 symlink는 그 경로로 다시 목록을 읽을 수 있습니다.
  expect((await list(join(folder, "안 폴더"))).status).toBe(200);
  expect((await list(join(folder, "밖 폴더"))).status).toBe(403);
});

test("빈 폴더는 항목 없이, 허용 루트 밖의 폴더는 403, 없는 경로와 파일은 404로 답한다", async () => {
  await mkdir(join(root, "빈 폴더"));
  await writeFile(join(root, "파일.md"), "");

  expect(await page(join(root, "빈 폴더"))).toEqual({ entries: [], total: 0, next: null });
  expect(await list(join(parent, "outside"))).toEqual({
    status: 403,
    body: { ok: false, error: "허용 범위 밖의 폴더입니다." },
  });
  for (const path of [join(root, "없는 폴더"), join(root, "파일.md")]) {
    expect(await list(path)).toEqual({
      status: 404,
      body: { ok: false, error: "폴더를 찾을 수 없습니다." },
    });
  }
});

test.each([
  ["상대 경로", localFolderApiPath("relative", null)],
  ["JSON이 아닌 cursor", localFolderApiPath("/tmp", "abc")],
  ["형식이 다른 cursor", localFolderApiPath("/tmp", JSON.stringify([true, "1", "a"]))],
  ["path 없음", LOCAL_FOLDER_PATH],
])("잘못된 요청을 거부한다: %s", async (_, path) => {
  const response = await handleLocalFolderRequest(
    new Request(`http://localhost${path}${path.includes("?") ? "&" : "?"}${WORKSPACE_QUERY}=repo`),
  );
  expect(response.status).toBe(400);
});

test("등록하지 않은 workspace 이름이면 폴더를 읽지 않고 404로 답한다", async () => {
  const response = await handleLocalFolderRequest(
    new Request(`http://localhost${localFolderApiPath(root, null)}&${WORKSPACE_QUERY}=other`),
  );
  expect(response.status).toBe(404);
});
