import { mkdir, mkdtemp, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { selectWorkspaceAction } from "./workspaceActions";
import { handleRegisterWorkspaceRequest, handleWorkspacesRequest } from "./workspacesRouteApi";

let launchRoot: string;
let otherRoot: string;
const originalWorkspace = process.env.BEADS_DESK_WORKSPACE;

async function beadsWorkspace(): Promise<string> {
  const root = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-workspaces-")));
  await mkdir(join(root, ".beads"));
  return root;
}

function register(body: unknown): Promise<Response> {
  return handleRegisterWorkspaceRequest(
    new Request("http://localhost/api/workspaces", {
      method: "POST",
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
  expect((await notWorkspace.json()).error).toBe(`beads workspace를 찾지 못했습니다: ${plain}`);
  expect(malformed.status).toBe(400);
});

test("화면에서는 등록한 workspace로만 바꿀 수 있다", async () => {
  await register({ path: otherRoot });

  expect(await selectWorkspaceAction(otherRoot)).toEqual({ ok: true, data: null });
  expect(await selectWorkspaceAction("/elsewhere")).toEqual({
    ok: false,
    error: "등록되지 않은 workspace입니다: /elsewhere",
  });
  expect(await selectWorkspaceAction(1 as unknown as string)).toEqual({
    ok: false,
    error: "요청 형식이 올바르지 않습니다.",
  });
});
