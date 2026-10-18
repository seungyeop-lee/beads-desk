import { mkdir, mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { selectWorkspaceAction } from "./workspaceActions";
import { handleRegisterWorkspaceRequest, handleWorkspacesRequest } from "./workspacesRouteApi";

// Next 요청 밖에서는 쿠키와 헤더를 읽을 수 없으므로 언어를 정해 둡니다.
vi.mock("@/server/web/locale/requestLocale", () => ({
  requestLocale: () => Promise.resolve("ko"),
}));

let launchRoot: string;
let otherRoot: string;
const originalWorkspace = process.env.BEADS_DESK_WORKSPACE;

async function beadsWorkspace(): Promise<string> {
  const root = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-workspaces-")));
  await mkdir(join(root, ".beads"));
  await writeFile(join(root, ".beads", "config.yaml"), "");
  return root;
}

function register(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return handleRegisterWorkspaceRequest(
    new Request("http://localhost/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
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

test("현재 workspace와 고를 수 있는 workspace를 돌려준다", async () => {
  const response = handleWorkspacesRequest();

  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({
    ok: true,
    data: { current: launchRoot, workspaces: [launchRoot] },
  });
});

test("workspace를 등록하고, select를 주면 현재 workspace로 바꾼다", async () => {
  const registered = await (await register({ path: join(otherRoot) })).json();
  const selected = await (await register({ path: otherRoot, select: true })).json();

  expect(registered.data).toEqual({ current: launchRoot, workspaces: [launchRoot, otherRoot] });
  expect(selected.data).toEqual({ current: otherRoot, workspaces: [launchRoot, otherRoot] });
});

test("beads workspace가 아니거나 본문이 잘못되면 400으로 거부한다", async () => {
  const plain = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-plain-")));

  const notWorkspace = await register({ path: plain });
  const malformed = await register({ path: 3 });

  expect(notWorkspace.status).toBe(400);
  expect((await notWorkspace.json()).error).toBe(`No beads workspace found: ${plain}`);
  expect(malformed.status).toBe(400);
});

test("JSON이 아닌 본문이나 다른 사이트에서 보낸 요청은 등록하지 않는다", async () => {
  // 다른 사이트의 페이지는 text/plain POST를 사전 확인 없이 보낼 수 있습니다.
  const plainText = await register({ path: otherRoot }, { "Content-Type": "text/plain" });
  const crossSite = await register({ path: otherRoot }, { "Sec-Fetch-Site": "cross-site" });
  const fromCli = await register({ path: otherRoot }, { "Sec-Fetch-Site": "none" });

  expect(plainText.status).toBe(415);
  expect(crossSite.status).toBe(403);
  expect(fromCli.status).toBe(200);
  expect((await fromCli.json()).data.workspaces).toEqual([launchRoot, otherRoot]);
});

test("화면에서는 등록한 workspace로만 바꿀 수 있다", async () => {
  await register({ path: otherRoot });

  expect(await selectWorkspaceAction(otherRoot)).toEqual({ ok: true, data: null });
  expect(await selectWorkspaceAction("/elsewhere")).toEqual({
    ok: false,
    error:
      "등록되지 않은 workspace입니다: /elsewhere. 그 디렉터리에서 bd-desk start를 실행해 등록해 주세요.",
  });
  expect(await selectWorkspaceAction(1 as unknown as string)).toEqual({
    ok: false,
    error: "요청 형식이 올바르지 않습니다.",
  });
});
