import { staleIssues, type Issue } from "@beads-desk/bd";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { handleStaleIssuesRequest } from "./hygieneRouteApi";

vi.mock("@beads-desk/bd", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beads-desk/bd")>()),
  staleIssues: vi.fn<typeof staleIssues>(),
}));

// Next 요청 밖에서는 쿠키와 헤더를 읽을 수 없으므로 언어를 정해 둡니다.
vi.mock("@/server/web/locale/requestLocale", () => ({
  requestLocale: () => Promise.resolve("ko"),
}));

const originalWorkspace = process.env.BEADS_DESK_WORKSPACE;

beforeEach(() => {
  process.env.BEADS_DESK_WORKSPACE = "/workspace";
  vi.mocked(staleIssues).mockResolvedValue({ ok: true, value: [] });
});

afterEach(() => {
  process.env.BEADS_DESK_WORKSPACE = originalWorkspace;
  vi.resetAllMocks();
});

function staleRequest(query = ""): Request {
  return new Request(`http://localhost/api/hygiene/stale${query}`);
}

test("오래 방치된 이슈는 고른 기준 일수로 따로 읽는다", async () => {
  const stale = [{ id: "t-1" } as Issue];
  vi.mocked(staleIssues).mockResolvedValue({ ok: true, value: stale });

  const response = await handleStaleIssuesRequest(staleRequest("?staleDays=7"));

  expect(staleIssues).toHaveBeenCalledWith("/workspace", 7);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ ok: true, data: stale });
});

test("기준 일수를 지정하지 않으면 30일로 읽는다", async () => {
  await handleStaleIssuesRequest(staleRequest());

  expect(staleIssues).toHaveBeenCalledWith("/workspace", 30);
});

test("고를 수 없는 기준 일수는 bd를 실행하지 않고 거부한다", async () => {
  const response = await handleStaleIssuesRequest(staleRequest("?staleDays=3"));

  expect(response.status).toBe(400);
  expect(staleIssues).not.toHaveBeenCalled();
});

test("오래 방치된 이슈를 읽지 못하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(staleIssues).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  const response = await handleStaleIssuesRequest(staleRequest());

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ ok: false, error: "boom" });
});
