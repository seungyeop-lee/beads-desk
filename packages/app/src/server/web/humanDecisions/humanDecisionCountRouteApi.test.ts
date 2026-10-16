import { humanDecisionIssues, type Issue } from "@beads-desk/bd";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { handleHumanDecisionCountRequest } from "./humanDecisionCountRouteApi";

vi.mock("@beads-desk/bd", () => ({
  humanDecisionIssues: vi.fn<typeof humanDecisionIssues>(),
}));

const originalWorkspace = process.env.BEADS_DESK_WORKSPACE;

beforeEach(() => {
  process.env.BEADS_DESK_WORKSPACE = "/workspace";
});

afterEach(() => {
  process.env.BEADS_DESK_WORKSPACE = originalWorkspace;
  vi.resetAllMocks();
});

test("workspace의 열린 human gate와 판단을 기다리는 이슈를 더한 개수를 돌려준다", async () => {
  vi.mocked(humanDecisionIssues).mockResolvedValue({
    ok: true,
    value: {
      gates: [{ id: "g-1" } as Issue],
      labeled: [
        { id: "q-1", status: "open", labels: ["human"] } as Issue,
        { id: "q-2", status: "closed", labels: ["human"] } as Issue,
      ],
    },
  });

  const response = await handleHumanDecisionCountRequest();

  expect(humanDecisionIssues).toHaveBeenCalledWith("/workspace");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ ok: true, data: 2 });
});

test("bd가 실패하면 bd의 메시지를 오류로 돌려준다", async () => {
  vi.mocked(humanDecisionIssues).mockResolvedValue({
    ok: false,
    error: { message: "boom\n", exitCode: 1 },
  });

  const response = await handleHumanDecisionCountRequest();

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ ok: false, error: "boom" });
});
