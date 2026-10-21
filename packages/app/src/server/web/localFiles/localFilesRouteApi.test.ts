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
vi.mock("@/server/infra/runtime/serverRuntime", () => ({
  findWorkspace: (slug: string) => (slug === "repo" ? { root, slug } : null),
}));
vi.mock("@/server/web/locale/requestLocale", () => ({ requestLocale: async () => "ko" }));

const get = (path: string, headers?: Record<string, string>) =>
  handleLocalFileRequest(new Request(`http://localhost${localFileUrl(path, "repo")}`, { headers }));

// git hook 안에서 실행하면 GIT_DIR 등이 hook을 실행한 저장소를 가리켜, fixture를 만드는 git과 서버가 worktree를 찾는 git이
// 그 저장소를 대상으로 실행됩니다. fixture를 만들 때와 테스트마다 GIT_ 환경 변수를 뺍니다.
function unsetGitEnv(): void {
  for (const key of Object.keys(process.env))
    if (key.startsWith("GIT_")) vi.stubEnv(key, undefined);
}

beforeAll(async () => {
  unsetGitEnv();
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
  await writeFile(join(parent, "repo-other", "secret.webm"), "outside video");
  await writeFile(join(root, "조사 결과.md"), "# 조사 결과");
  await writeFile(join(worktree, "다른 결과.md"), "# worktree 결과");
  await symlink(join(parent, "repo-other"), join(root, "escape"));
  await symlink(join(parent, "repo-other", "secret.md"), join(root, "escape.md"));
  await symlink(join(parent, "repo-other", "secret.webm"), join(root, "escape.webm"));
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
  unsetGitEnv();
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

test("등록하지 않은 workspace 이름이면 파일을 읽지 않고 404로 답한다", async () => {
  const response = await handleLocalFileRequest(
    new Request(`http://localhost${localFileUrl(join(root, "README.md"), "other")}`),
  );

  expect(response.status).toBe(404);
  expect(await response.text()).toContain("등록되지 않은 workspace입니다: other.");
});

test("인코딩을 겹친 경로로 허용 범위를 벗어날 수 없다", async () => {
  const response = await handleLocalFileRequest(
    new Request(
      `http://localhost/api/local-files?workspace=repo&path=${encodeURIComponent(`${root}/../repo-other/secret.md`)}`,
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

test.each([
  ["webm", "video/webm"],
  ["mp4", "video/mp4"],
  ["WEBM", "video/webm"],
])(
  "%s 영상은 재생되도록 sandbox 없이 media만 허용하는 CSP로 제공한다",
  async (extension, contentType) => {
    const file = join(root, `녹화.${extension}`);
    await writeFile(file, "video");
    const response = await get(file);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("video");
    expect(response.headers.get("Content-Type")).toBe(contentType);
    expect(response.headers.get("Content-Security-Policy")).toBe(
      "default-src 'none'; media-src 'self'",
    );
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
  },
);

test.each([
  ["bytes=2-5", "2345", "bytes 2-5/10"],
  ["bytes=7-", "789", "bytes 7-9/10"],
  ["bytes=-3", "789", "bytes 7-9/10"],
  ["bytes=5-100", "56789", "bytes 5-9/10"],
  ["bytes=-100", "0123456789", "bytes 0-9/10"],
  ["Bytes=0-0", "0", "bytes 0-0/10"],
])("영상의 Range 요청 %s에 그 구간만 206으로 보낸다", async (range, body, contentRange) => {
  const file = join(root, "구간 녹화.mp4");
  await writeFile(file, "0123456789");
  const response = await get(file, { Range: range });
  expect(response.status).toBe(206);
  expect(await response.text()).toBe(body);
  expect(response.headers.get("Content-Range")).toBe(contentRange);
  expect(response.headers.get("Accept-Ranges")).toBe("bytes");
  expect(response.headers.get("Content-Type")).toBe("video/mp4");
  expect(response.headers.get("Content-Security-Policy")).toBe(
    "default-src 'none'; media-src 'self'",
  );
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
});

test.each(["bytes=10-", "bytes=100-200", "bytes=-0"])(
  "영상 크기를 벗어난 Range 요청 %s에는 416과 전체 크기를 보낸다",
  async (range) => {
    const file = join(root, "구간 녹화.webm");
    await writeFile(file, "0123456789");
    const response = await get(file, { Range: range });
    expect(response.status).toBe(416);
    expect(response.headers.get("Content-Range")).toBe("bytes */10");
    expect(response.headers.get("Content-Type")).toBeNull();
    expect(await response.text()).toBe("");
  },
);

test.each(["bytes=abc", "items=0-1", "bytes=5-3", "bytes=0-1,4-5", "bytes=-"])(
  "형식이 맞지 않거나 여러 구간인 Range 요청 %s는 무시하고 영상 전체를 보낸다",
  async (range) => {
    const file = join(root, "구간 녹화.webm");
    await writeFile(file, "0123456789");
    const response = await get(file, { Range: range });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("0123456789");
    expect(response.headers.get("Content-Range")).toBeNull();
  },
);

test("이미지와 텍스트는 Range 요청에도 전체를 보낸다", async () => {
  for (const [extension, contentType] of [
    ["png", "image/png"],
    ["md", "text/plain; charset=utf-8"],
  ]) {
    const file = join(root, `구간.${extension}`);
    await writeFile(file, "0123456789");
    const response = await get(file, { Range: "bytes=2-5" });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("0123456789");
    expect(response.headers.get("Content-Type")).toBe(contentType);
    expect(response.headers.get("Content-Range")).toBeNull();
    expect(response.headers.get("Accept-Ranges")).toBeNull();
  }
});

test.each(["prefix", "traversal", "file-symlink", "directory-symlink"])(
  "Range 요청도 허용 밖 영상을 차단한다: %s",
  async (kind) => {
    const path = {
      prefix: join(parent, "repo-other", "secret.webm"),
      traversal: `${root}/../repo-other/secret.webm`,
      "file-symlink": join(root, "escape.webm"),
      "directory-symlink": join(root, "escape", "secret.webm"),
    }[kind]!;
    const response = await get(path, { Range: "bytes=0-3" });
    expect(response.status).toBe(403);
    expect(response.headers.get("Content-Range")).toBeNull();
    expect(await response.text()).toBe("허용 범위 밖의 파일입니다.");
  },
);

test("Range 요청도 없는 영상과 디렉터리는 제공하지 않는다", async () => {
  await mkdir(join(root, "폴더.webm"), { recursive: true });
  for (const path of [join(root, "missing.webm"), join(root, "폴더.webm")])
    expect((await get(path, { Range: "bytes=0-3" })).status).toBe(404);
});

test("다른 사이트의 파일 요청을 거부한다", async () => {
  for (const site of ["same-site", "cross-site"])
    expect((await get(join(root, "조사 결과.md"), { "Sec-Fetch-Site": site })).status).toBe(403);
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
