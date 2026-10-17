import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { localFileUrl } from "@/shared/contract/localFiles";
import { handleLocalFileRequest } from "./localFilesRouteApi";

let root: string;
let parent: string;
let worktree: string;
let worktreeParent: string;
vi.mock("@/server/infra/runtime/serverRuntime", () => ({ currentWorkspaceRoot: () => root }));
vi.mock("@/server/web/locale/requestLocale", () => ({ requestLocale: async () => "ko" }));

const get = (path: string, headers?: Record<string, string>) =>
  handleLocalFileRequest(
    new Request(`http://localhost${localFileUrl(path)}`, {
      headers: { Host: "localhost:3000", ...headers },
    }),
  );

beforeAll(async () => {
  // fixture는 기본 허용 루트(/tmp, /var/tmp, os.tmpdir()) 밖이어야 허용 밖 접근의 403 검사가 성립하므로,
  // 임시 디렉터리가 모두 기본 허용 루트가 된 지금은 프로젝트 디렉터리 아래에 만듭니다.
  parent = await mkdtemp(join(process.cwd(), "beads-desk-local-files-"));
  root = join(parent, "repo");
  worktree = join(parent, "elsewhere", "작업 트리");
  await mkdir(root);
  execFileSync("git", ["-C", root, "init", "--quiet"]);
  execFileSync("git", [
    "-C",
    root,
    "-c",
    "user.name=test",
    "-c",
    "user.email=test@example.com",
    "commit",
    "--allow-empty",
    "-qm",
    "초기화",
  ]);
  execFileSync("git", ["-C", root, "worktree", "add", "--quiet", "--detach", worktree]);
  await mkdir(join(parent, "repo-other"));
  await writeFile(join(parent, "repo-other", "secret.md"), "outside secret");
  await writeFile(join(root, "조사 결과.md"), "# 조사 결과");
  await writeFile(join(worktree, "다른 결과.md"), "# worktree 결과");
  await symlink(join(parent, "repo-other"), join(root, "escape"));
  await symlink(join(parent, "repo-other", "secret.md"), join(root, "escape.md"));
  await symlink(join(worktree, "다른 결과.md"), join(root, "allowed.md"));
  worktreeParent = join(parent, "repo-wt");
  await mkdir(join(worktreeParent, "review-artifacts", "bd-x"), { recursive: true });
  await writeFile(join(worktreeParent, "review-artifacts", "bd-x", "shot.png"), "png");
  await symlink(join(parent, "repo-other", "secret.md"), join(worktreeParent, "escape.md"));
  await mkdir(join(parent, "repo-wt-other"));
  await writeFile(join(parent, "repo-wt-other", "secret.md"), "outside secret");
});
// 개발자가 셸에 export한 허용 루트를 물려받으면 허용 밖이어야 할 파일이 허용되어 403 검사가 실패합니다.
// 모든 테스트를 설정하지 않은 상태에서 시작하고, 허용 루트가 필요한 테스트만 값을 지정합니다.
beforeEach(() => {
  vi.stubEnv("BEADS_DESK_LOCAL_FILE_ROOTS", undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
});
afterAll(async () => {
  await rm(parent, { recursive: true, force: true });
});

test("workspace와 별도 git worktree의 한글·공백 파일을 제공한다", async () => {
  for (const [path, content] of [
    [join(root, "조사 결과.md"), "# 조사 결과"],
    [join(worktree, "다른 결과.md"), "# worktree 결과"],
    [join(root, "allowed.md"), "# worktree 결과"],
  ]) {
    const response = await get(path!);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(content);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  }
});

test.each(["/etc/hosts", "prefix", "traversal", "file-symlink", "directory-symlink"])(
  "허용 밖 접근을 차단한다: %s",
  async (kind) => {
    const path =
      {
        prefix: join(parent, "repo-other", "secret.md"),
        traversal: `${root}/../repo-other/secret.md`,
        "file-symlink": join(root, "escape.md"),
        "directory-symlink": join(root, "escape", "secret.md"),
      }[kind] ?? kind;
    const response = await get(path);
    expect(response.status).toBe(403);
    expect(await response.text()).toBe("허용 범위 밖의 파일입니다.");
  },
);

test("인코딩을 겹친 경로로 허용 범위를 벗어날 수 없다", async () => {
  const response = await handleLocalFileRequest(
    new Request(
      `http://localhost/api/local-files?path=${encodeURIComponent(`${root}/../repo-other/secret.md`)}`,
      { headers: { Host: "localhost:3000" } },
    ),
  );
  expect(response.status).toBe(403);
  const twice = await get(encodeURIComponent(join(parent, "repo-other", "secret.md")));
  expect(twice.status).toBe(400);
});

test("없는 파일과 디렉터리는 제공하지 않는다", async () => {
  expect((await get(join(root, "missing.md"))).status).toBe(404);
  expect((await get(root)).status).toBe(404);
});

test.each(["", "relative.md", "bad\0path"])("잘못된 경로를 거부한다: %s", async (path) => {
  expect((await get(path)).status).toBe(400);
});

test("PNG를 이미지로 제공하고 HTML·SVG는 실행하지 않는 텍스트로 제공한다", async () => {
  for (const extension of ["png", "html", "svg", "js"]) {
    const file = join(root, `active.${extension}`);
    await writeFile(file, "<script>globalThis.pwned = true</script>");
    const response = await get(file);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      extension === "png" ? "image/png" : "text/plain; charset=utf-8",
    );
    expect(response.headers.get("Content-Security-Policy")).toBe("sandbox; default-src 'none'");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
  }
});

test("다른 사이트의 파일 요청을 거부한다", async () => {
  for (const site of ["same-site", "cross-site"])
    expect((await get(join(root, "조사 결과.md"), { "Sec-Fetch-Site": site })).status).toBe(403);
});

test.each(["localhost", "localhost:3000", "127.0.0.1:3000", "[::1]:3000"])(
  "로컬 호스트 Host의 요청을 받아들인다: %s",
  async (host) => {
    expect((await get(join(root, "조사 결과.md"), { Host: host })).status).toBe(200);
  },
);

test.each(["evil.example:3000", "localhost.evil.example"])(
  "로컬 호스트가 아닌 Host의 요청을 거부한다: %s",
  async (host) => {
    const response = await get(join(root, "조사 결과.md"), { Host: host });
    expect(response.status).toBe(403);
    expect(await response.text()).toBe("허용 범위 밖의 파일입니다.");
  },
);

test("Host 없는 요청을 거부한다", async () => {
  const response = await handleLocalFileRequest(
    new Request(`http://localhost${localFileUrl(join(root, "조사 결과.md"))}`),
  );
  expect(response.status).toBe(403);
});

test("git 조회가 실패하면 workspace 파일만 허용한다", async () => {
  const original = root;
  root = join(parent, "plain");
  await mkdir(root);
  // fixture가 프로젝트 저장소 안에 있어 git이 상위 저장소를 찾아내므로, 깨진 .git으로 실패를 만듭니다.
  await writeFile(join(root, ".git"), "gitdir: 깨진 경로");
  await writeFile(join(root, "inside.md"), "plain workspace");
  try {
    expect((await get(join(root, "inside.md"))).status).toBe(200);
    expect((await get(join(worktree, "다른 결과.md"))).status).toBe(403);
  } finally {
    root = original;
  }
});

test("설정하지 않으면 worktree를 모아 둔 상위 디렉터리의 파일을 허용하지 않는다", async () => {
  const response = await get(join(worktreeParent, "review-artifacts", "bd-x", "shot.png"));
  expect(response.status).toBe(403);
});

test.each(["/tmp", "/var/tmp", tmpdir()])("%s 아래 파일을 기본으로 제공한다", async (base) => {
  const dir = await mkdtemp(join(base, "bd-desk-local-files-tmp-"));
  try {
    await writeFile(join(dir, "shot.png"), "png");
    const response = await get(join(dir, "shot.png"));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("png");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("BEADS_DESK_LOCAL_FILE_ROOTS로 지정한 디렉터리 아래 파일을 제공한다", async () => {
  vi.stubEnv("BEADS_DESK_LOCAL_FILE_ROOTS", ["relative", "", worktreeParent].join(delimiter));
  const response = await get(join(worktreeParent, "review-artifacts", "bd-x", "shot.png"));
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("image/png");
  expect(await response.text()).toBe("png");
});

test("~로 시작하는 허용 루트를 홈 디렉터리 기준으로 푼다", async () => {
  vi.stubEnv("HOME", parent);
  vi.stubEnv("USERPROFILE", parent);
  vi.stubEnv("BEADS_DESK_LOCAL_FILE_ROOTS", "~/repo-wt");
  const response = await get(join(worktreeParent, "review-artifacts", "bd-x", "shot.png"));
  expect(response.status).toBe(200);
});

test.each(["prefix", "symlink"])("지정한 허용 루트 밖 접근을 차단한다: %s", async (kind) => {
  vi.stubEnv("BEADS_DESK_LOCAL_FILE_ROOTS", worktreeParent);
  const path =
    kind === "prefix"
      ? join(parent, "repo-wt-other", "secret.md")
      : join(worktreeParent, "escape.md");
  const response = await get(path);
  expect(response.status).toBe(403);
  expect(await response.text()).toBe("허용 범위 밖의 파일입니다.");
});

test("지정한 허용 루트가 없어도 workspace와 worktree 파일은 제공한다", async () => {
  vi.stubEnv("BEADS_DESK_LOCAL_FILE_ROOTS", join(parent, "missing-wt"));
  expect((await get(join(root, "조사 결과.md"))).status).toBe(200);
  expect((await get(join(worktree, "다른 결과.md"))).status).toBe(200);
});
