import { issueEvents, showIssue, type IssueDetail, type IssueEvent } from "@beads-desk/bd";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { handleIssueDetailRequest, handleIssueHistoryRequest } from "./issueDetailRouteApi";

vi.mock("@beads-desk/bd", () => ({
  showIssue: vi.fn<typeof showIssue>(),
  issueEvents: vi.fn<typeof issueEvents>(),
}));

const originalWorkspace = process.env.BEADS_DESK_WORKSPACE;

beforeEach(() => {
  process.env.BEADS_DESK_WORKSPACE = "/workspace";
});

afterEach(() => {
  process.env.BEADS_DESK_WORKSPACE = originalWorkspace;
  vi.mocked(showIssue).mockReset();
  vi.mocked(issueEvents).mockReset();
});

test("workspace에서 이슈 상세를 조회해 돌려준다", async () => {
  const detail = { id: "demo-1", title: "첫 이슈" } as IssueDetail;
  vi.mocked(showIssue).mockResolvedValue({ ok: true, value: detail });

  const response = await handleIssueDetailRequest("demo-1");

  expect(showIssue).toHaveBeenCalledWith("/workspace", "demo-1");
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ ok: true, data: detail });
});

test("bd가 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(showIssue).mockResolvedValue({
    ok: false,
    error: { message: "Issue demo-9 not found\n", exitCode: 1 },
  });

  const response = await handleIssueDetailRequest("demo-9");

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ ok: false, error: "Issue demo-9 not found" });
});

test("workspace에서 이슈의 변경 이벤트를 읽어 돌려준다", async () => {
  const events = [{ id: "e-1", type: "created" } as IssueEvent];
  vi.mocked(issueEvents).mockResolvedValue({ ok: true, value: events });

  const response = await handleIssueHistoryRequest("demo-1");

  expect(issueEvents).toHaveBeenCalledWith("/workspace", "demo-1");
  expect(await response.json()).toEqual({ ok: true, data: events });
});

test("변경 이벤트를 읽지 못하면 bd의 메시지와 500을 돌려준다", async () => {
  vi.mocked(issueEvents).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  const response = await handleIssueHistoryRequest("demo-1");

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ ok: false, error: "boom" });
});
