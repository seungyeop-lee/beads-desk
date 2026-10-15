import { chmod, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { handleDescriptionSearchRequest, handleIssueListRequest } from "./issueListRouteApi";

// Next 요청 밖에서는 쿠키와 헤더를 읽을 수 없으므로 언어를 정해 둡니다.
vi.mock("@/server/web/locale/requestLocale", () => ({
  requestLocale: () => Promise.resolve("ko"),
}));

let workDir: string;
const originalEnv = { BD_BIN: process.env.BD_BIN, workspace: process.env.BEADS_DESK_WORKSPACE };

beforeEach(async () => {
  workDir = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-issues-")));
  process.env.BEADS_DESK_WORKSPACE = workDir;
});

afterEach(() => {
  process.env.BD_BIN = originalEnv.BD_BIN;
  process.env.BEADS_DESK_WORKSPACE = originalEnv.workspace;
});

/**
 * 인자가 정확히 일치할 때만 stdout을 돌려주고, 실행된 인자와 cwd를 기록하는 가짜 bd를 지정합니다.
 * 목록 조회와 함께 실행하는 bd blocked와 bd ready에는 signals의 출력(없으면 빈 목록)을 돌려줍니다.
 */
async function useFakeBd(
  args: string,
  response: { stdout?: string; stderr?: string; code?: number },
  signals: { blocked?: string; ready?: string } = {},
) {
  const fakeBd = join(workDir, "fake-bd");
  await writeFile(join(workDir, "stdout"), response.stdout ?? "");
  await writeFile(join(workDir, "blocked"), signals.blocked ?? "[]");
  await writeFile(join(workDir, "ready"), signals.ready ?? "[]");
  await writeFile(
    fakeBd,
    [
      "#!/bin/sh",
      `echo "$(pwd) $*" >> "${join(workDir, "calls.log")}"`,
      `if [ "$*" = "--sandbox ${args}" ]; then`,
      `  cat "${join(workDir, "stdout")}"`,
      response.stderr ? `  echo "${response.stderr}" >&2` : "",
      `  exit ${response.code ?? 0}`,
      "fi",
      `[ "$*" = "--sandbox blocked --json" ] && cat "${join(workDir, "blocked")}" && exit 0`,
      `[ "$*" = "--sandbox ready --limit 0 --json" ] && cat "${join(workDir, "ready")}" && exit 0`,
      "exit 99",
    ].join("\n"),
  );
  await chmod(fakeBd, 0o755);
  process.env.BD_BIN = fakeBd;
}

function request(query: string): Request {
  return new Request(`http://localhost/api/issues${query}`);
}

const issues = JSON.stringify([
  { id: "demo-1", title: "첫 이슈", status: "open" },
  { id: "demo-2", title: "둘째 이슈", status: "in_progress" },
]);

test("지정한 상태의 이슈를 workspace에서 조회해 돌려준다", async () => {
  await useFakeBd("list --json --tree=false --status open,in_progress --limit 0", {
    stdout: issues,
  });

  const response = await handleIssueListRequest(request("?status=open,in_progress"));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.ok && body.data.map((issue: { id: string }) => issue.id)).toEqual([
    "demo-1",
    "demo-2",
  ]);
  expect(await readFile(join(workDir, "calls.log"), "utf8")).toContain(`${workDir} --sandbox list`);
});

test("상태를 지정하지 않으면 모든 상태의 이슈를 조회한다", async () => {
  await useFakeBd("list --json --tree=false --all --limit 0", { stdout: issues });

  const response = await handleIssueListRequest(request(""));

  expect(response.status).toBe(200);
});

test("목록에는 막고 있는 이슈 id와 bd ready 여부를 채워 돌려준다", async () => {
  await useFakeBd(
    "list --json --tree=false --all --limit 0",
    { stdout: issues },
    {
      blocked: JSON.stringify([{ id: "demo-1", status: "open", blocked_by: ["demo-9"] }]),
      ready: JSON.stringify([{ id: "demo-2", status: "in_progress" }]),
    },
  );

  const body = await (await handleIssueListRequest(request(""))).json();

  expect(body.data).toMatchObject([
    { id: "demo-1", blockedBy: ["demo-9"] },
    { id: "demo-2", ready: true },
  ]);
});

test("ready를 지정하면 바로 작업할 수 있는 이슈를 조회한다", async () => {
  await useFakeBd("ready --limit 0 --json", { stdout: issues });

  const response = await handleIssueListRequest(request("?status=ready"));

  expect(response.status).toBe(200);
});

test("상태 query가 올바르지 않으면 bd를 실행하지 않고 400을 돌려준다", async () => {
  await useFakeBd("unused", {});

  const response = await handleIssueListRequest(request("?status=bogus"));

  expect(response.status).toBe(400);
  expect((await response.json()).ok).toBe(false);
  await expect(readFile(join(workDir, "calls.log"), "utf8")).rejects.toThrow("ENOENT");
});

test("bd가 실패하면 bd의 오류 메시지와 500을 돌려준다", async () => {
  await useFakeBd("list --json --tree=false --status open --limit 0", {
    stderr: "database is locked",
    code: 1,
  });

  const response = await handleIssueListRequest(request("?status=open"));

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ ok: false, error: "database is locked" });
});

test("설명 검색은 설명에 검색어가 든 이슈의 id만 돌려준다", async () => {
  await useFakeBd("list --json --tree=false --all --brief --limit 0 --desc-contains=token", {
    stdout: issues,
  });

  const response = await handleDescriptionSearchRequest(
    new Request("http://localhost/api/issue-search?description=token"),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, data: ["demo-1", "demo-2"] });
});

test("설명 검색어가 비어 있으면 bd를 실행하지 않고 400을 돌려준다", async () => {
  await useFakeBd("unused", {});

  const response = await handleDescriptionSearchRequest(
    new Request("http://localhost/api/issue-search?description=%20"),
  );

  expect(response.status).toBe(400);
  expect((await response.json()).ok).toBe(false);
  await expect(readFile(join(workDir, "calls.log"), "utf8")).rejects.toThrow("ENOENT");
});
