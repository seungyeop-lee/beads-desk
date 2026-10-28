import { mkdir, mkdtemp, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { nonWorkspaceRootCandidates, readLocalFile } from "./readLocalFile";

// 검사를 마친 경로가 파일을 연 직후에 바뀌는 상황을 만들려고, 실제 open이 끝난 뒤 테스트가 정한 변경을 실행합니다.
const afterOpen = vi.hoisted(() => ({ change: null as ((path: string) => Promise<void>) | null }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    open: async (...args: Parameters<typeof actual.open>) => {
      const file = await actual.open(...args);
      await afterOpen.change?.(String(args[0]));
      return file;
    },
  };
});

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bd-desk-read-local-file-"));
  vi.stubEnv("BEADS_DESK_LOCAL_FILE_ROOTS", undefined);
});
afterEach(async () => {
  afterOpen.change = null;
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

test.each([
  ["다른 파일", (path: string) => writeFile(path, "replaced")],
  ["symlink", (path: string) => symlink(`${path}.moved`, path)],
])("연 뒤 경로가 %s로 바뀌면 열지 않은 것으로 처리한다", async (_, replace) => {
  const file = join(dir, "shot.png");
  await writeFile(file, "png");
  afterOpen.change = async (path) => {
    await rename(path, `${path}.moved`);
    await replace(path);
  };

  expect(await readLocalFile(dir, file)).toEqual({ status: 404 });
});

test("환경 변수 없이 ~/.beads-starter와 중첩 폴더의 파일을 열되 형제 폴더와 바깥을 가리키는 symlink는 차단한다", async () => {
  const home = await mkdtemp(join(process.cwd(), ".local-file-home-"));
  try {
    vi.stubEnv("HOME", home);
    const root = join(home, ".beads-starter");
    const sibling = join(home, ".beads-starter-other");
    await mkdir(root);
    await mkdir(sibling);
    const file = join(root, "report.md");
    const nestedDir = join(root, "sessions", "reviews", "artifacts");
    await mkdir(nestedDir, { recursive: true });
    const nestedFile = join(nestedDir, "report.md");
    const outside = join(sibling, "private.md");
    const link = join(root, "outside.md");
    await writeFile(file, "report contents");
    await writeFile(nestedFile, "nested report contents");
    await writeFile(outside, "private contents");
    await symlink(outside, link);

    expect(await readLocalFile(dir, file)).toEqual({
      status: 200,
      contents: new TextEncoder().encode("report contents"),
    });
    expect(await readLocalFile(dir, nestedFile)).toEqual({
      status: 200,
      contents: new TextEncoder().encode("nested report contents"),
    });
    expect(await readLocalFile(dir, outside)).toEqual({ status: 403 });
    expect(await readLocalFile(dir, link)).toEqual({ status: 403 });
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("Windows 규칙에서는 /tmp와 /var/tmp를 빼고 ~\\와 ~/를 홈 디렉터리 기준으로 푼다", () => {
  vi.stubEnv("HOME", "C:\\Users\\tester");
  vi.stubEnv("BEADS_DESK_LOCAL_FILE_ROOTS", "~\\shots;~/videos;~;relative;D:\\artifacts");

  expect(nonWorkspaceRootCandidates("win32")).toEqual(
    expect.arrayContaining([
      tmpdir(),
      "C:\\Users\\tester\\shots",
      "C:\\Users\\tester\\videos",
      "C:\\Users\\tester",
      "D:\\artifacts",
    ]),
  );
  expect(nonWorkspaceRootCandidates("win32")).not.toEqual(
    expect.arrayContaining(["/tmp", "/var/tmp"]),
  );
});

test("macOS/Linux 규칙에서는 /tmp와 /var/tmp를 넣고 ~\\는 상대 경로로 보고 무시한다", () => {
  vi.stubEnv("HOME", "/home/tester");
  vi.stubEnv("BEADS_DESK_LOCAL_FILE_ROOTS", "~\\shots:~/videos:/srv/artifacts");

  expect(nonWorkspaceRootCandidates("linux")).toEqual(
    expect.arrayContaining(["/tmp", "/var/tmp", tmpdir(), "/home/tester/videos", "/srv/artifacts"]),
  );
  expect(nonWorkspaceRootCandidates("linux")).not.toContain("~\\shots");
});
