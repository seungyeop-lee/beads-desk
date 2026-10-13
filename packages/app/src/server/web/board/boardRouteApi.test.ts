import { boardIssues, type Issue } from "@beads-desk/bd";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { handleBoardRequest } from "./boardRouteApi";

vi.mock("@beads-desk/bd", () => ({ boardIssues: vi.fn<typeof boardIssues>() }));

const originalWorkspace = process.env.BEADS_DESK_WORKSPACE;

beforeEach(() => {
  process.env.BEADS_DESK_WORKSPACE = "/workspace";
});

afterEach(() => {
  process.env.BEADS_DESK_WORKSPACE = originalWorkspace;
  vi.mocked(boardIssues).mockReset();
});

test("workspace의 board 열 구성을 돌려준다", async () => {
  const items = [{ column: "ready" as const, issue: { id: "demo-1" } as Issue }];
  vi.mocked(boardIssues).mockResolvedValue({ ok: true, value: items });

  const response = await handleBoardRequest();

  expect(boardIssues).toHaveBeenCalledWith("/workspace");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ ok: true, data: items });
});

test("bd가 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(boardIssues).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  const response = await handleBoardRequest();

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ ok: false, error: "boom" });
});
