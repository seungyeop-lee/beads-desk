import { basename } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fakeBdWorkspace } from "@/server/infra/fakeBd.testkit";
import { handleIssueTextSearchRequest, handleIssueListRequest } from "./issueListRouteApi";

// Next 요청 밖에서는 쿠키와 헤더를 읽을 수 없으므로 언어를 정해 둡니다.
vi.mock("@/server/web/locale/requestLocale", () => ({
  requestLocale: () => Promise.resolve("ko"),
}));

const fakeBd = fakeBdWorkspace("beads-desk-issues-");

// workspace 디렉터리가 테스트마다 바뀌므로, 서버 전역의 등록 목록도 새 디렉터리로 다시 만들게 지웁니다.
beforeEach(() => {
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("beads-desk.serverRuntime")];
  vi.stubEnv("BEADS_DESK_WORKSPACE", fakeBd.workDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/**
 * 목록 조회와 함께 실행하는 bd blocked와 bd ready에는 signals의 출력(없으면 빈 목록)을 돌려주는 가짜 bd를 지정합니다.
 */
async function useFakeBd(
  args: string,
  response: { stdout?: string; stderr?: string; code?: number },
  signals: { blocked?: string; ready?: string } = {},
) {
  await fakeBd.useFakeBd({
    [args]: response,
    "blocked --json": { stdout: signals.blocked ?? "[]" },
    "ready --limit 0 --json": { stdout: signals.ready ?? "[]" },
  });
}

function request(path: string): Request {
  const url = new URL(path.startsWith("/") ? path : `/api/issues${path}`, "http://localhost");
  url.searchParams.set("workspace", basename(fakeBd.workDir));
  return new Request(url);
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
  expect(await fakeBd.callsLog()).toContain(`${fakeBd.workDir} --sandbox list`);
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
  await expect(fakeBd.callsLog()).rejects.toThrow("ENOENT");
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

test("본문 검색은 notes나 댓글에 검색어가 든 이슈와 맞은 곳을 돌려주고, gate에서 맞은 결과는 버린다", async () => {
  const exported = [
    { id: "demo-1", title: "첫 이슈", issue_type: "task", notes: "토큰 만료를 재현했다" },
    {
      id: "demo-2",
      title: "둘째 이슈",
      issue_type: "task",
      comments: [{ id: "c-1", author: "agent", text: "토큰을 다시 받는다" }],
    },
    { id: "demo-gate", title: "Review", issue_type: "gate", description: "토큰 리뷰" },
  ];
  await fakeBd.useFakeBd({
    "dolt show --json": { stdout: JSON.stringify({ embedded: false, database: "demo" }) },
    "sql SELECT DOLT_HASHOF_DB() AS h --json": { stdout: JSON.stringify([{ h: "hash-1" }]) },
    export: { stdout: exported.map((record) => JSON.stringify(record)).join("\n") },
  });

  const response = await handleIssueTextSearchRequest(request("/api/issue-search?text=토큰"));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    ok: true,
    data: [
      { id: "demo-1", hits: [{ field: "notes", excerpt: "토큰 만료를 재현했다" }] },
      { id: "demo-2", hits: [{ field: "comment", excerpt: "토큰을 다시 받는다" }] },
    ],
  });
});

test("본문 검색어가 비어 있으면 bd를 실행하지 않고 400을 돌려준다", async () => {
  await useFakeBd("unused", {});

  const response = await handleIssueTextSearchRequest(request("/api/issue-search?text=%20"));

  expect(response.status).toBe(400);
  expect((await response.json()).ok).toBe(false);
  await expect(fakeBd.callsLog()).rejects.toThrow("ENOENT");
});
