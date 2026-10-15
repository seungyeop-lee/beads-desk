import {
  duplicateCandidates,
  epicStatuses,
  lintFindings,
  orphanIssues,
  staleIssues,
  type Issue,
} from "@beads-desk/bd";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { handleHygieneRequest, handleStaleIssuesRequest } from "./hygieneRouteApi";

vi.mock("@beads-desk/bd", () => ({
  staleIssues: vi.fn<typeof staleIssues>(),
  orphanIssues: vi.fn<typeof orphanIssues>(),
  lintFindings: vi.fn<typeof lintFindings>(),
  duplicateCandidates: vi.fn<typeof duplicateCandidates>(),
  epicStatuses: vi.fn<typeof epicStatuses>(),
}));

// Next 요청 밖에서는 쿠키와 헤더를 읽을 수 없으므로 언어를 정해 둡니다.
vi.mock("@/server/web/locale/requestLocale", () => ({
  requestLocale: () => Promise.resolve("ko"),
}));

const originalWorkspace = process.env.BEADS_DESK_WORKSPACE;

beforeEach(() => {
  process.env.BEADS_DESK_WORKSPACE = "/workspace";
  vi.mocked(staleIssues).mockResolvedValue({ ok: true, value: [] });
  vi.mocked(orphanIssues).mockResolvedValue({ ok: true, value: [] });
  vi.mocked(lintFindings).mockResolvedValue({ ok: true, value: [] });
  vi.mocked(duplicateCandidates).mockResolvedValue({ ok: true, value: [] });
  vi.mocked(epicStatuses).mockResolvedValue({ ok: true, value: [] });
});

afterEach(() => {
  process.env.BEADS_DESK_WORKSPACE = originalWorkspace;
  vi.resetAllMocks();
});

function staleRequest(query = ""): Request {
  return new Request(`http://localhost/api/hygiene/stale${query}`);
}

function epic(id: string, totalChildren: number, closedChildren: number) {
  return { epic: { id, status: "open" } as Issue, totalChildren, closedChildren };
}

test("기준 일수와 관계없는 점검 결과를 모아 돌려주고, 에픽은 하위 이슈가 모두 닫힌 것만 담는다", async () => {
  const duplicates = [
    [
      { id: "t-2", title: "a" },
      { id: "t-3", title: "a" },
    ],
  ] satisfies [unknown, unknown][];
  vi.mocked(duplicateCandidates).mockResolvedValue({ ok: true, value: duplicates });
  vi.mocked(epicStatuses).mockResolvedValue({
    ok: true,
    value: [epic("e-done", 2, 2), epic("e-partly", 2, 1)],
  });

  const response = await handleHygieneRequest();

  expect(staleIssues).not.toHaveBeenCalled();
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({
    ok: true,
    data: {
      orphans: [],
      lint: [],
      duplicates,
      closableEpics: [{ id: "e-done", status: "open" }],
    },
  });
});

test("점검 하나라도 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(lintFindings).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  const response = await handleHygieneRequest();

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ ok: false, error: "boom" });
});

test("오래 방치된 이슈는 고른 기준 일수로 따로 읽는다", async () => {
  const stale = [{ id: "t-1" } as Issue];
  vi.mocked(staleIssues).mockResolvedValue({ ok: true, value: stale });

  const response = await handleStaleIssuesRequest(staleRequest("?staleDays=7"));

  expect(staleIssues).toHaveBeenCalledWith("/workspace", 7);
  expect(orphanIssues).not.toHaveBeenCalled();
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
