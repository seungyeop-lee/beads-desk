import { mkdir, mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { handleRegisterWorkspaceRequest, handleWorkspacesRequest } from "./workspacesRouteApi";

// Next 요청 밖에서는 쿠키와 헤더를 읽을 수 없으므로 언어를 정해 둡니다.
vi.mock("@/server/web/locale/requestLocale", () => ({
  requestLocale: () => Promise.resolve("ko"),
}));

let launchRoot: string;
let otherRoot: string;

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
  vi.stubEnv("BEADS_DESK_WORKSPACE", launchRoot);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const entry = (root: string) => ({ root, slug: basename(root) });

test("등록한 workspace를 화면 주소에 쓰는 이름과 함께 돌려준다", async () => {
  const response = handleWorkspacesRequest();

  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ ok: true, data: { workspaces: [entry(launchRoot)] } });
});

test("workspace를 등록하고 등록한 workspace를 돌려준다. 이미 등록했으면 그대로 돌려준다", async () => {
  const registered = await (await register({ path: join(otherRoot, ".") })).json();
  const again = await (await register({ path: otherRoot })).json();

  const workspaces = [entry(launchRoot), entry(otherRoot)];
  expect(registered.data).toEqual({ registered: entry(otherRoot), workspaces });
  expect(again.data).toEqual({ registered: entry(otherRoot), workspaces });
});

test("beads workspace가 아니거나 본문이 잘못되면 400으로 거부한다", async () => {
  const plain = await realpath(await mkdtemp(join(tmpdir(), "beads-desk-plain-")));

  const notWorkspace = await register({ path: plain });
  const malformed = await register({ path: 3 });

  expect(notWorkspace.status).toBe(400);
  expect((await notWorkspace.json()).error).toBe(`beads workspace를 찾지 못했습니다: ${plain}`);
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
  expect((await fromCli.json()).data.registered).toEqual(entry(otherRoot));
});
