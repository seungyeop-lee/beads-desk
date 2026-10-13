import { decisionRecords, type DecisionRecord, type Issue } from "@beads-desk/bd";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { handleDecisionsRequest } from "./decisionsRouteApi";

vi.mock("@beads-desk/bd", () => ({
  decisionRecords: vi.fn<typeof decisionRecords>(),
}));

const originalWorkspace = process.env.BEADS_DESK_WORKSPACE;

beforeEach(() => {
  process.env.BEADS_DESK_WORKSPACE = "/workspace";
});

afterEach(() => {
  process.env.BEADS_DESK_WORKSPACE = originalWorkspace;
  vi.resetAllMocks();
});

test("workspace의 decision과 대체 관계를 돌려준다", async () => {
  const decisions = [
    { decision: { id: "d-1" } as Issue, supersededBy: "d-2" },
  ] satisfies DecisionRecord[];
  vi.mocked(decisionRecords).mockResolvedValue({ ok: true, value: decisions });

  const response = await handleDecisionsRequest();

  expect(decisionRecords).toHaveBeenCalledWith("/workspace");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ ok: true, data: decisions });
});

test("bd가 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(decisionRecords).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  const response = await handleDecisionsRequest();

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ ok: false, error: "boom" });
});
